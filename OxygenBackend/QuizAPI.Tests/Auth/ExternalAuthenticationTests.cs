using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.Authentication;
using QuizAPI.Exceptions;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.AuthenticationService.External;
using QuizAPI.Services.Email;
using QuizAPI.Services.Invitations;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// External (Google/Microsoft) sign-in: login-or-link resolution, the invite-gated external
/// signup, and the signup-ticket boundary. The provider verifier is mocked — the real verifiers
/// are thin wrappers over the Microsoft.IdentityModel stack, and these tests are about OUR
/// decisions after "identity proven", not the provider's crypto.
/// See docs/auth/social-login-plan.md §9 for the intended coverage.
/// </summary>
public class ExternalAuthenticationTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRoleRepository> _roles = new();
    private readonly Mock<IRefreshTokenRepository> _refreshTokens = new();
    private readonly Mock<IEmailVerificationTokenRepository> _emailTokens = new();
    private readonly Mock<IInviteCodeRepository> _inviteCodes = new();
    private readonly IInviteCodeGenerator _inviteGenerator = new InviteCodeGenerator();
    private readonly Mock<IExternalLoginRepository> _externalLogins = new();
    private readonly Mock<IExternalIdentityVerifier> _verifier = new();
    private readonly Mock<ITokenService> _tokens = new();
    private readonly Mock<IAuditService> _audit = new();
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IEmailSender> _email = new();

    private static readonly ExternalIdentity GoogleIdentity = new(
        Provider: "google",
        SubjectId: "google-sub-123",
        Email: "person@example.com",
        EmailVerified: true,
        DisplayName: "Some Person");

    public ExternalAuthenticationTests()
    {
        _verifier.SetupGet(v => v.Provider).Returns("google");
        _verifier.Setup(v => v.VerifyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(GoogleIdentity);
    }

    private static ApplicationDbContext NewInMemoryContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    private static IConfiguration Config(bool requireInviteCode = false, bool googleEnabled = true) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Signup:RequireInviteCode"] = requireInviteCode ? "true" : "false",
                ["Authentication:Google:Enabled"] = googleEnabled ? "true" : "false",
            })
            .Build();

    private AuthenticationService CreateSut(bool requireInviteCode = false, bool googleEnabled = true) => new(
        _users.Object, _roles.Object, _refreshTokens.Object, _emailTokens.Object,
        _inviteCodes.Object, _inviteGenerator, _externalLogins.Object,
        new[] { _verifier.Object },
        _tokens.Object, _audit.Object,
        _notifications.Object, _email.Object, NewInMemoryContext(),
        Config(requireInviteCode, googleEnabled));

    private static ExternalLoginDTO LoginDto() => new() { Provider = "google", IdToken = "raw-id-token" };

    private static User ExistingUser(string email = "person@example.com") => new()
    {
        Id = Guid.NewGuid(),
        Username = "Existing",
        ImmutableName = "existing",
        Email = email,
        UserRoles = new List<UserRole> { new() { Role = new Role { Id = 2, Name = "User" } } },
    };

    // Token minting for any path that ends in a session.
    private void SetupTokenMinting()
    {
        _tokens.Setup(t => t.GenerateRefreshToken())
               .Returns(("raw-refresh", "refresh-hash", DateTime.UtcNow.AddDays(7)));
        _tokens.Setup(t => t.GenerateToken(It.IsAny<User>(), It.IsAny<IReadOnlyCollection<string>>()))
               .Returns("jwt");
    }

    // ---- external-login: resolution ----------------------------------------------------------

    [Fact]
    public async Task ExternalLogin_KnownIdentity_LogsIn_WithoutCreatingAnything()
    {
        var user = ExistingUser();
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync("google", "google-sub-123", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(new ExternalLogin { UserId = user.Id, Provider = "google", ProviderSubjectId = "google-sub-123" });
        _users.Setup(r => r.GetByIdAsync(user.Id, true, It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);
        SetupTokenMinting();

        var outcome = await CreateSut().ExternalLoginAsync(LoginDto());

        Assert.NotNull(outcome.Auth);
        Assert.Null(outcome.SignupRequired);
        // No new link, no new user.
        _externalLogins.Verify(r => r.AddAsync(It.IsAny<ExternalLogin>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExternalLogin_VerifiedEmailMatchesExistingAccount_LinksAndLogsIn()
    {
        var user = ExistingUser();
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((ExternalLogin?)null);
        _users.Setup(r => r.GetByEmailAsync("person@example.com", true, It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);
        SetupTokenMinting();

        var outcome = await CreateSut().ExternalLoginAsync(LoginDto());

        Assert.NotNull(outcome.Auth);
        _externalLogins.Verify(r => r.AddAsync(
            It.Is<ExternalLogin>(el =>
                el.UserId == user.Id &&
                el.Provider == "google" &&
                el.ProviderSubjectId == "google-sub-123"),
            It.IsAny<CancellationToken>()), Times.Once);
        _audit.Verify(a => a.LogAsync(
            AuditActions.ExternalAccountLinked, It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<object?>(), It.IsAny<object?>(), user.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExternalLogin_UnverifiedEmailMatchesExistingAccount_ThrowsConflict_AndLinksNothing()
    {
        // The provider did NOT vouch for the email → linking would be an account-takeover vector.
        _verifier.Setup(v => v.VerifyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(GoogleIdentity with { EmailVerified = false });
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((ExternalLogin?)null);
        _users.Setup(r => r.GetByEmailAsync("person@example.com", true, It.IsAny<CancellationToken>()))
              .ReturnsAsync(ExistingUser());

        await Assert.ThrowsAsync<ConflictException>(() => CreateSut().ExternalLoginAsync(LoginDto()));

        _externalLogins.Verify(r => r.AddAsync(It.IsAny<ExternalLogin>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExternalLogin_NoMatchingAccount_ReturnsSignupRequired_WithTicket_AndNoSession()
    {
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((ExternalLogin?)null);
        _users.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), true, It.IsAny<CancellationToken>()))
              .ReturnsAsync((User?)null);
        _tokens.Setup(t => t.GenerateExternalSignupTicket(GoogleIdentity)).Returns("ticket-jwt");

        var outcome = await CreateSut().ExternalLoginAsync(LoginDto());

        Assert.Null(outcome.Auth); // no session, no refresh token — signup isn't done
        Assert.NotNull(outcome.SignupRequired);
        Assert.Equal("ticket-jwt", outcome.SignupRequired!.SignupTicket);
        Assert.Equal("person@example.com", outcome.SignupRequired.Email);
        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _refreshTokens.Verify(r => r.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExternalLogin_UnknownProvider_ThrowsValidation()
    {
        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut().ExternalLoginAsync(new ExternalLoginDTO { Provider = "facebook", IdToken = "x" }));
    }

    [Fact]
    public async Task ExternalLogin_DisabledProvider_ThrowsValidation_EvenWithRegisteredVerifier()
    {
        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut(googleEnabled: false).ExternalLoginAsync(LoginDto()));
    }

    [Fact]
    public async Task ExternalLogin_BadToken_ThrowsUnauthorized_AndAuditsFailedLogin()
    {
        _verifier.Setup(v => v.VerifyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ThrowsAsync(new UnauthorizedException("Invalid Google token."));

        await Assert.ThrowsAsync<UnauthorizedException>(() => CreateSut().ExternalLoginAsync(LoginDto()));

        _audit.Verify(a => a.LogAsync(
            AuditActions.LoginFailed, It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ---- external-signup: ticket boundary ----------------------------------------------------

    [Fact]
    public async Task ExternalSignup_InvalidOrExpiredTicket_ThrowsUnauthorized_AndCreatesNothing()
    {
        _tokens.Setup(t => t.ValidateExternalSignupTicket(It.IsAny<string>()))
               .Returns((ExternalIdentity?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            CreateSut().ExternalSignupAsync(new ExternalSignupDTO { SignupTicket = "junk", Username = "NewUser" }));

        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExternalSignup_IdentityAlreadyLinked_ThrowsConflict()
    {
        _tokens.Setup(t => t.ValidateExternalSignupTicket("ticket")).Returns(GoogleIdentity);
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync("google", "google-sub-123", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(new ExternalLogin());

        await Assert.ThrowsAsync<ConflictException>(() =>
            CreateSut().ExternalSignupAsync(new ExternalSignupDTO { SignupTicket = "ticket", Username = "NewUser" }));
    }

    // ---- external-signup: creation -----------------------------------------------------------

    private void SetupSignupHappyPath()
    {
        _tokens.Setup(t => t.ValidateExternalSignupTicket("ticket")).Returns(GoogleIdentity);
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((ExternalLogin?)null);
        _users.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);
        _roles.Setup(r => r.GetByNameAsync("User", It.IsAny<CancellationToken>()))
              .ReturnsAsync(new Role { Id = 2, Name = "User" });
        _users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), false, It.IsAny<CancellationToken>()))
              .ReturnsAsync((Guid id, bool _, CancellationToken _) => new User
              {
                  Id = id,
                  Username = "NewUser",
                  Email = "person@example.com",
                  UserRoles = new List<UserRole> { new() { Role = new Role { Id = 2, Name = "User" } } },
              });
        _tokens.Setup(t => t.GenerateEmailVerificationToken())
               .Returns(("raw-token", "hash", DateTime.UtcNow.AddHours(24)));
        SetupTokenMinting();
    }

    private static ExternalSignupDTO SignupDto(string? inviteCode = null) => new()
    {
        SignupTicket = "ticket",
        Username = "NewUser",
        InviteCode = inviteCode,
    };

    [Fact]
    public async Task ExternalSignup_FlagOn_ValidCode_CreatesUser_LinksIdentity_ConsumesCodeOnce()
    {
        SetupSignupHappyPath();
        var hash = _inviteGenerator.Hash("K7QM-3FXP-9T");
        _inviteCodes.Setup(r => r.GetRedeemableByHashAsync(hash, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new InviteCode { CodeHash = hash });
        _inviteCodes.Setup(r => r.TryConsumeAsync(hash, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(1);

        User? created = null;
        _users.Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
              .Callback<User, CancellationToken>((u, _) => created = u)
              .Returns(Task.CompletedTask);

        var result = await CreateSut(requireInviteCode: true).ExternalSignupAsync(SignupDto("K7QM-3FXP-9T"));

        Assert.NotNull(result.Response);
        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.Null(created!.PasswordHash);       // external-only account — no password ever set
        Assert.True(created.EmailConfirmed);      // provider-verified → verification flow skipped
        _externalLogins.Verify(r => r.AddAsync(
            It.Is<ExternalLogin>(el => el.Provider == "google" && el.ProviderSubjectId == "google-sub-123"),
            It.IsAny<CancellationToken>()), Times.Once);
        _inviteCodes.Verify(r => r.TryConsumeAsync(hash, It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
        _email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _audit.Verify(a => a.LogAsync(
            AuditActions.InviteCodeRedeemed, It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExternalSignup_FlagOn_LostConsumeRace_Rejects_WithNoSideEffects()
    {
        SetupSignupHappyPath();
        var hash = _inviteGenerator.Hash("K7QM-3FXP-9T");
        _inviteCodes.Setup(r => r.GetRedeemableByHashAsync(hash, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new InviteCode { CodeHash = hash });
        _inviteCodes.Setup(r => r.TryConsumeAsync(hash, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(0); // someone else spent it between validate and consume

        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut(requireInviteCode: true).ExternalSignupAsync(SignupDto("K7QM-3FXP-9T")));

        // Rolled back → none of the post-commit side effects may run.
        _email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _audit.Verify(a => a.LogAsync(
            AuditActions.UserSignedUp, It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExternalSignup_FlagOff_NeverTouchesInviteRepository()
    {
        SetupSignupHappyPath();

        var result = await CreateSut(requireInviteCode: false).ExternalSignupAsync(SignupDto());

        Assert.NotNull(result.Response);
        _inviteCodes.Verify(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _inviteCodes.Verify(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExternalSignup_UnverifiedEmail_CreatesUnconfirmedUser_AndSendsVerificationEmail()
    {
        SetupSignupHappyPath();
        _tokens.Setup(t => t.ValidateExternalSignupTicket("ticket"))
               .Returns(GoogleIdentity with { EmailVerified = false });

        User? created = null;
        _users.Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
              .Callback<User, CancellationToken>((u, _) => created = u)
              .Returns(Task.CompletedTask);

        await CreateSut().ExternalSignupAsync(SignupDto());

        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.False(created!.EmailConfirmed);
        _email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

/// <summary>
/// The signup ticket is a real signed JWT (minted by the real TokenService), so its boundary —
/// round-trip integrity, tamper rejection, and above all "an access token is NOT a ticket" — is
/// tested against the real implementation, not a mock.
/// </summary>
public class ExternalSignupTicketTests
{
    private static readonly IConfiguration JwtConfig = new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "unit-test-signing-key-0123456789abcdef0123456789abcdef",
            ["Jwt:Issuer"] = "https://test-issuer",
            ["Jwt:Audience"] = "https://test-audience",
        })
        .Build();

    private readonly TokenService _tokenService = new(JwtConfig);

    private static readonly ExternalIdentity Identity = new(
        "google", "sub-1", "a@b.com", EmailVerified: true, DisplayName: "A B");

    [Fact]
    public void Ticket_RoundTrips_TheFullIdentity()
    {
        var ticket = _tokenService.GenerateExternalSignupTicket(Identity);
        var recovered = _tokenService.ValidateExternalSignupTicket(ticket);

        Assert.Equal(Identity, recovered);
    }

    [Fact]
    public void Ticket_Tampered_IsRejected()
    {
        var ticket = _tokenService.GenerateExternalSignupTicket(Identity);
        var tampered = ticket[..^2] + "xx"; // corrupt the signature

        Assert.Null(_tokenService.ValidateExternalSignupTicket(tampered));
    }

    [Fact]
    public void AccessToken_PresentedAsTicket_IsRejected()
    {
        // Same key, same issuer — but the audience differs, so a genuine access token must never
        // pass ticket validation (and vice versa: the middleware rejects tickets by audience too).
        var accessToken = _tokenService.GenerateToken(
            new User { Id = Guid.NewGuid(), Email = "a@b.com", Username = "ab" },
            new[] { "User" });

        Assert.Null(_tokenService.ValidateExternalSignupTicket(accessToken));
    }

    [Fact]
    public void Garbage_IsRejected()
    {
        Assert.Null(_tokenService.ValidateExternalSignupTicket("not-a-jwt"));
        Assert.Null(_tokenService.ValidateExternalSignupTicket(""));
    }
}
