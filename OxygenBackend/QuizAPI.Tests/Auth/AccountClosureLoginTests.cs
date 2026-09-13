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
/// Signing in during the grace period cancels a pending account closure (ADR 0012).
///
/// <para><b>Why this file does not mock the way its neighbours do.</b> The behaviour under test is
/// not a decision inside one class — it is the wiring between three: LoginAsync has to look past the
/// soft-delete filter, hand off to AccountClosureService, and have that land on the same row. A mock
/// of IAccountClosureService would assert only that LoginAsync called a method, which is the part we
/// already know; it would keep passing if the closure service stopped clearing IsDeleted, and it
/// would keep passing if the lookup silently reverted to the filtered one.</para>
///
/// <para>So the repository and the closure service here are real, over an in-memory database, and
/// only the collaborators that have nothing to do with this path are mocked. Same approach as
/// <c>UserServiceRoleTests</c>, and for the same reason.</para>
/// </summary>
public class AccountClosureLoginTests
{
    private const string Password = "correct-horse-battery-staple";
    private const int GraceDays = 30;

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    /// <summary>
    /// Real UserRepository and real AccountClosureService over <paramref name="ctx"/>; everything
    /// else stubbed, because nothing else on the login path is what this test is about.
    /// </summary>
    private static (AuthenticationService Sut, IAccountClosureService Closure) BuildSut(
        ApplicationDbContext ctx)
    {
        var closure = new AccountClosureService(
            ctx,
            new Mock<IAuditService>().Object,
            Options.Create(new AccountClosureOptions { GracePeriodDays = GraceDays }),
            NullLogger<AccountClosureService>.Instance,
            new Mock<IEmailSender>().Object,
            new ConfigurationBuilder().Build());

        var sut = new AuthenticationService(
            new UserRepository(ctx),
            new Mock<IRoleRepository>().Object,
            new Mock<IRefreshTokenRepository>().Object,
            new Mock<IEmailVerificationTokenRepository>().Object,
            new Mock<IPasswordResetTokenRepository>().Object,
            new Mock<IInviteCodeRepository>().Object,
            new Mock<IInviteCodeGenerator>().Object,
            new Mock<IExternalLoginRepository>().Object,
            Enumerable.Empty<IExternalIdentityVerifier>(),
            new Mock<ITokenService>().Object,
            new Mock<IAuditService>().Object,
            new Mock<INotificationService>().Object,
            new Mock<IEmailSender>().Object,
            new Mock<IBreachedPasswordChecker>().Object,
            ctx,
            closure,
            new ConfigurationBuilder().Build());

        return (sut, closure);
    }

    private static User AddUser(ApplicationDbContext ctx, string email)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "player",
            ImmutableName = "player",
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password),
            ProfileImageUrl = string.Empty,
            EmailConfirmed = true,
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static Task<User> Reload(ApplicationDbContext ctx, Guid id) =>
        ctx.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == id);

    /// <summary>
    /// The whole point of the grace period. Remove the CancelClosureAsync call from LoginAsync and
    /// this test fails; so does narrowing the lookup back to GetByEmailAsync, which would make the
    /// closing account invisible and turn this into "invalid credentials".
    /// </summary>
    [Fact]
    public async Task LoggingInDuringTheGracePeriod_CancelsTheClosure()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "leaver@example.com");
        var (sut, closure) = BuildSut(ctx);

        await closure.RequestClosureAsync(user.Id);
        Assert.True((await Reload(ctx, user.Id)).IsDeleted);

        var result = await sut.LoginAsync(new LoginDTO { Email = "leaver@example.com", Password = Password });

        Assert.NotNull(result);

        // The response has to say so, or the recovery is invisible to the person it happened to.
        Assert.True(result.Response.ClosureCancelled);

        var after = await Reload(ctx, user.Id);
        Assert.False(after.IsDeleted);
        Assert.Null(after.DeletionRequestedAt);
        Assert.Null(after.AnonymisedAt);
    }

    /// <summary>
    /// The other half, and the reason the widened lookup is safe: an account an ADMIN removed is
    /// soft-deleted with no closure request, and stays locked out. If this ever starts passing a
    /// login through, ADR 0012's lookup change has re-opened admin-deleted accounts.
    /// </summary>
    [Fact]
    public async Task AdminDeletedAccount_StillCannotLogIn()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "removed@example.com");

        // What UserService.DeleteUserAsync does: IsDeleted, and no DeletionRequestedAt.
        user.IsDeleted = true;
        await ctx.SaveChangesAsync();

        var (sut, _) = BuildSut(ctx);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            sut.LoginAsync(new LoginDTO { Email = "removed@example.com", Password = Password }));

        Assert.True((await Reload(ctx, user.Id)).IsDeleted);
    }

    /// <summary>
    /// The other side of the flag, and the one that runs on nearly every login: nothing was
    /// pending, so nothing is announced. A notice on an ordinary sign-in would be alarming — it
    /// would tell people their account had been scheduled for deletion when it never was.
    /// </summary>
    [Fact]
    public async Task AnOrdinaryLogin_DoesNotClaimToHaveCancelledAnything()
    {
        using var ctx = NewContext();
        AddUser(ctx, "regular@example.com");
        var (sut, _) = BuildSut(ctx);

        var result = await sut.LoginAsync(
            new LoginDTO { Email = "regular@example.com", Password = Password });

        Assert.False(result.Response.ClosureCancelled);
    }

    /// <summary>
    /// A closing account still needs the right password. Cancelling on a failed attempt would let
    /// anyone keep a stranger's account alive by guessing at it.
    /// </summary>
    [Fact]
    public async Task WrongPasswordDuringTheGracePeriod_DoesNotCancelTheClosure()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "leaver@example.com");
        var (sut, closure) = BuildSut(ctx);

        await closure.RequestClosureAsync(user.Id);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            sut.LoginAsync(new LoginDTO { Email = "leaver@example.com", Password = "not-the-password" }));

        var after = await Reload(ctx, user.Id);
        Assert.True(after.IsDeleted);
        Assert.NotNull(after.DeletionRequestedAt);
    }
}
