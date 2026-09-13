using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.Authentication;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.AccountClosure;
using QuizAPI.Services.Audit;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.AuthenticationService.External;
using QuizAPI.Services.Email;
using QuizAPI.Services.Invitations;
using QuizAPI.Services.Password;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// The Google/Microsoft half of ADR 0012's recovery rule: signing in during the grace period
/// cancels a pending closure, whichever sign-in method the person actually has.
///
/// <para><b>Why this file exists separately from AccountClosureLoginTests.</b> That file proved the
/// rule for the password path only, and the rule read as satisfied while external sign-in still
/// resolved its user through the filtered <c>GetByIdAsync</c> — so a closing account came back as
/// null and a returning Google user was told "Invalid credentials", with no way back in at all if
/// they had never set a password. The lesson is that "signing in cancels a closure" is a property
/// of every sign-in path, not of LoginAsync, so every path needs its own test.</para>
///
/// <para>Same approach as its neighbour: a real UserRepository and a real AccountClosureService over
/// an in-memory database, because the behaviour under test IS the wiring between the lookup, the
/// closure service and the row. Only the provider verifier and collaborators with nothing to do
/// with this path are mocked.</para>
/// </summary>
public class AccountClosureExternalLoginTests
{
    private const int GraceDays = 30;
    private const string Subject = "google-sub-123";

    private static readonly ExternalIdentity GoogleIdentity = new(
        Provider: "google",
        SubjectId: Subject,
        Email: "leaver@example.com",
        EmailVerified: true,
        DisplayName: "Some Person");

    private readonly Mock<IExternalIdentityVerifier> _verifier = new();

    public AccountClosureExternalLoginTests()
    {
        _verifier.SetupGet(v => v.Provider).Returns("google");
        _verifier.Setup(v => v.VerifyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(GoogleIdentity);
    }

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    private static IConfiguration GoogleEnabled() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:Google:Enabled"] = "true",
                ["Signup:RequireInviteCode"] = "false",
            })
            .Build();

    /// <summary>
    /// Real UserRepository, real ExternalLoginRepository and real AccountClosureService over
    /// <paramref name="ctx"/>. A mocked external-login repository would hide exactly the bug this
    /// file is about: the link row is found, and it is the USER lookup behind it that fails.
    ///
    /// <para>The refresh-token repository is real too, for a duller reason: it owns the
    /// <c>SaveChanges</c> at the end of <c>BuildAuthResultAsync</c>, which is what actually writes
    /// the new provider link. Mock it and the link assertion below reads an empty table.</para>
    /// </summary>
    private (AuthenticationService Sut, IAccountClosureService Closure) BuildSut(ApplicationDbContext ctx)
    {
        var closure = new AccountClosureService(
            ctx,
            new Mock<IAuditService>().Object,
            Options.Create(new AccountClosureOptions { GracePeriodDays = GraceDays }),
            NullLogger<AccountClosureService>.Instance,
            new Mock<IEmailSender>().Object,
            new ConfigurationBuilder().Build());

        var tokens = new Mock<ITokenService>();
        tokens.Setup(t => t.GenerateRefreshToken())
              .Returns(("raw-refresh", "refresh-hash", DateTime.UtcNow.AddDays(7)));
        tokens.Setup(t => t.GenerateToken(It.IsAny<User>(), It.IsAny<IReadOnlyCollection<string>>()))
              .Returns("jwt");

        var sut = new AuthenticationService(
            new UserRepository(ctx),
            new Mock<IRoleRepository>().Object,
            new RefreshTokenRepository(ctx),
            new Mock<IEmailVerificationTokenRepository>().Object,
            new Mock<IPasswordResetTokenRepository>().Object,
            new Mock<IInviteCodeRepository>().Object,
            new Mock<IInviteCodeGenerator>().Object,
            new ExternalLoginRepository(ctx),
            new[] { _verifier.Object },
            tokens.Object,
            new Mock<IAuditService>().Object,
            new Mock<INotificationService>().Object,
            new Mock<IEmailSender>().Object,
            new Mock<IBreachedPasswordChecker>().Object,
            ctx,
            closure,
            GoogleEnabled());

        return (sut, closure);
    }

    /// <param name="passwordHash">
    /// Null models the account this bug is worst for: signed up with Google, never set a password,
    /// so the password path is not an alternative way back in.
    /// </param>
    private static User AddUser(ApplicationDbContext ctx, string? passwordHash = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "player",
            ImmutableName = "player",
            Email = "leaver@example.com",
            PasswordHash = passwordHash,
            ProfileImageUrl = string.Empty,
            EmailConfirmed = true,
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static void AddGoogleLink(ApplicationDbContext ctx, Guid userId)
    {
        ctx.ExternalLogins.Add(new ExternalLogin
        {
            UserId = userId,
            Provider = "google",
            ProviderSubjectId = Subject,
            Email = "leaver@example.com",
            CreatedAt = DateTime.UtcNow,
        });
        ctx.SaveChanges();
    }

    private static Task<User> Reload(ApplicationDbContext ctx, Guid id) =>
        ctx.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == id);

    private static ExternalLoginDTO LoginDto() => new() { Provider = "google", IdToken = "raw-id-token" };

    /// <summary>
    /// The reported bug, as a test. Narrow the lookup in branch 1 back to GetByIdAsync and this
    /// fails with UnauthorizedException; drop the AdmitOrRejectDeletedAsync call and the account
    /// signs in but stays scheduled for anonymisation.
    /// </summary>
    [Fact]
    public async Task ExternalLoginDuringTheGracePeriod_CancelsTheClosure()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx);
        AddGoogleLink(ctx, user.Id);
        var (sut, closure) = BuildSut(ctx);

        await closure.RequestClosureAsync(user.Id);
        Assert.True((await Reload(ctx, user.Id)).IsDeleted);

        var outcome = await sut.ExternalLoginAsync(LoginDto());

        Assert.NotNull(outcome.Auth);
        Assert.Null(outcome.SignupRequired);
        Assert.True(outcome.Auth!.Response.ClosureCancelled);

        var after = await Reload(ctx, user.Id);
        Assert.False(after.IsDeleted);
        Assert.Null(after.DeletionRequestedAt);
        Assert.Null(after.AnonymisedAt);
    }

    /// <summary>
    /// The other half, matching the password path: an ADMIN-deleted account is soft-deleted with no
    /// closure request, and stays locked out no matter which provider the person signs in with.
    /// </summary>
    [Fact]
    public async Task ExternalLogin_AdminDeletedAccount_StillCannotSignIn()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx);
        AddGoogleLink(ctx, user.Id);

        // What UserService.DeleteUserAsync does: IsDeleted, and no DeletionRequestedAt.
        user.IsDeleted = true;
        await ctx.SaveChangesAsync();

        var (sut, _) = BuildSut(ctx);

        await Assert.ThrowsAsync<UnauthorizedException>(() => sut.ExternalLoginAsync(LoginDto()));

        Assert.True((await Reload(ctx, user.Id)).IsDeleted);
    }

    /// <summary>
    /// Branch 2: no provider link yet, but the verified address belongs to a closing password
    /// account. Through the filtered lookup that account was invisible, so this turned into
    /// "signup required" — and signup would have created a second account on the same address.
    /// </summary>
    [Fact]
    public async Task FirstExternalSignIn_MatchingAClosingAccount_LinksAndCancels()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, BCrypt.Net.BCrypt.HashPassword("correct-horse-battery-staple"));
        var (sut, closure) = BuildSut(ctx);

        await closure.RequestClosureAsync(user.Id);

        var outcome = await sut.ExternalLoginAsync(LoginDto());

        Assert.NotNull(outcome.Auth);
        Assert.Null(outcome.SignupRequired);
        Assert.True(outcome.Auth!.Response.ClosureCancelled);

        var after = await Reload(ctx, user.Id);
        Assert.False(after.IsDeleted);
        Assert.Null(after.DeletionRequestedAt);

        // Linked to the account that already existed — not a second one.
        Assert.Equal(1, await ctx.Users.IgnoreQueryFilters().CountAsync());
        var link = await ctx.ExternalLogins.SingleAsync();
        Assert.Equal(user.Id, link.UserId);
    }
}
