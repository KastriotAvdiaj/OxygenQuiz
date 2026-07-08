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
using QuizAPI.Services.Email;
using QuizAPI.Services.Invitations;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// Guard / negative-path tests for authentication. These cover the security-critical decisions —
/// rejecting duplicate signups, refusing bad credentials, not trusting invalid verification
/// tokens, and the invite-code signup gate. Dependencies are mocked, so no real database or
/// network is involved (the DbContext is in-memory and only provides the no-op signup transaction).
/// </summary>
public class AuthenticationServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRoleRepository> _roles = new();
    private readonly Mock<IRefreshTokenRepository> _refreshTokens = new();
    private readonly Mock<IEmailVerificationTokenRepository> _emailTokens = new();
    private readonly Mock<IInviteCodeRepository> _inviteCodes = new();
    private readonly IInviteCodeGenerator _inviteGenerator = new InviteCodeGenerator();
    private readonly Mock<ITokenService> _tokens = new();
    private readonly Mock<IAuditService> _audit = new();
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IEmailSender> _email = new();

    // The signup transaction is opened on the DbContext. EF's in-memory provider has no real
    // transactions, so we silence its TransactionIgnoredWarning and treat begin/commit/rollback
    // as no-ops — the atomic-consume guarantee lives in the SQL WHERE clause, covered separately.
    private static ApplicationDbContext NewInMemoryContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    private static IConfiguration Config(bool requireInviteCode = false) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Signup:RequireInviteCode"] = requireInviteCode ? "true" : "false",
            })
            .Build();

    private AuthenticationService CreateSut(bool requireInviteCode = false) => new(
        _users.Object, _roles.Object, _refreshTokens.Object, _emailTokens.Object,
        _inviteCodes.Object, _inviteGenerator, _tokens.Object, _audit.Object,
        _notifications.Object, _email.Object, NewInMemoryContext(), Config(requireInviteCode));

    private static SignupDTO ValidSignup(string? inviteCode = null) => new()
    {
        Email = "new@example.com",
        Username = "NewUser",
        Password = "a-strong-passphrase",
        InviteCode = inviteCode,
    };

    // Wires up the mocks so a clean signup runs end to end (default role present, the reloaded
    // user carries a role, tokens are minted). Individual tests override pieces of this.
    private void SetupHappyPath()
    {
        _roles.Setup(r => r.GetByNameAsync("User", It.IsAny<CancellationToken>()))
              .ReturnsAsync(new Role { Id = 2, Name = "User" });

        _tokens.Setup(t => t.GenerateEmailVerificationToken())
               .Returns(("raw-token", "hash", DateTime.UtcNow.AddHours(24)));
        _tokens.Setup(t => t.GenerateRefreshToken())
               .Returns(("raw-refresh", "refresh-hash", DateTime.UtcNow.AddDays(7)));
        _tokens.Setup(t => t.GenerateToken(It.IsAny<User>(), It.IsAny<IReadOnlyCollection<string>>()))
               .Returns("jwt");

        _users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), false, It.IsAny<CancellationToken>()))
              .ReturnsAsync((Guid id, bool _, CancellationToken _) => new User
              {
                  Id = id,
                  Username = "NewUser",
                  Email = "new@example.com",
                  UserRoles = new List<UserRole>
                  {
                      new() { Role = new Role { Id = 2, Name = "User" } }
                  }
              });
    }

    [Fact]
    public async Task Signup_WhenEmailAlreadyExists_ThrowsConflict()
    {
        _users.Setup(r => r.EmailExistsAsync("new@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => CreateSut().SignupAsync(ValidSignup()));
        Assert.Equal("Email is already in use.", ex.Message);
    }

    [Fact]
    public async Task Signup_WhenUsernameAlreadyTaken_ThrowsConflict()
    {
        _users.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => CreateSut().SignupAsync(ValidSignup()));
        Assert.Equal("Username is already taken.", ex.Message);
    }

    [Fact]
    public async Task Signup_WhenDefaultRoleMissing_ThrowsInvalidOperation()
    {
        _users.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);
        _roles.Setup(r => r.GetByNameAsync("User", It.IsAny<CancellationToken>()))
              .ReturnsAsync((Role?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateSut().SignupAsync(ValidSignup()));
    }

    // --- Invite-code gate -------------------------------------------------------------------

    [Fact]
    public async Task Signup_WhenInviteRequiredButMissing_ThrowsValidation_AndCreatesNoUser()
    {
        var ex = await Assert.ThrowsAsync<AppValidationException>(
            () => CreateSut(requireInviteCode: true).SignupAsync(ValidSignup(inviteCode: null)));
        Assert.Equal("An invite code is required.", ex.Message);

        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Signup_WhenInviteRequiredAndUnknownCode_ThrowsValidation_AndCreatesNoUser()
    {
        _inviteCodes.Setup(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync((InviteCode?)null);

        var ex = await Assert.ThrowsAsync<AppValidationException>(
            () => CreateSut(requireInviteCode: true).SignupAsync(ValidSignup(inviteCode: "BAD-CODE")));
        Assert.Equal("Invalid or already-used invite code.", ex.Message);

        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _inviteCodes.Verify(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Signup_WhenInviteRequiredAndValidCode_CreatesUser_AndConsumesCodeOnce()
    {
        SetupHappyPath();
        _inviteCodes.Setup(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new InviteCode { Id = 1, CodeHash = "hash" });
        _inviteCodes.Setup(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(1);

        var result = await CreateSut(requireInviteCode: true).SignupAsync(ValidSignup(inviteCode: "K7QM-3FXP-9T"));

        Assert.NotNull(result.Response);
        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        _inviteCodes.Verify(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
        _audit.Verify(a => a.LogAsync(AuditActions.InviteCodeRedeemed,
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<object>(),
            It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Signup_WhenConsumeLosesTheRace_ThrowsValidation_AndRunsNoSideEffects()
    {
        SetupHappyPath();
        _inviteCodes.Setup(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new InviteCode { Id = 1, CodeHash = "hash" });
        // The early check passed, but someone else spent the code first: 0 rows affected.
        _inviteCodes.Setup(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(0);

        var ex = await Assert.ThrowsAsync<AppValidationException>(
            () => CreateSut(requireInviteCode: true).SignupAsync(ValidSignup(inviteCode: "K7QM-3FXP-9T")));
        Assert.Equal("Invalid or already-used invite code.", ex.Message);

        // Rolled back: no welcome notification, no email, no signup audit.
        _notifications.Verify(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
        _audit.Verify(a => a.LogAsync(AuditActions.UserSignedUp,
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<object>(),
            It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Signup_WhenInviteNotRequired_DoesNotTouchInviteRepo()
    {
        SetupHappyPath();

        var result = await CreateSut(requireInviteCode: false).SignupAsync(ValidSignup());

        Assert.NotNull(result.Response);
        _inviteCodes.Verify(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _inviteCodes.Verify(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // --- Advisory up-front invite-code check (IsInviteCodeRedeemableAsync) -------------------
    // This is the non-consuming pre-check the signup form uses to reject a bad code on step 1.
    // It must never consume a code and must fail closed on blank input.

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task IsInviteCodeRedeemable_WhenCodeBlank_ReturnsFalse_WithoutQuerying(string? code)
    {
        var valid = await CreateSut(requireInviteCode: true).IsInviteCodeRedeemableAsync(code);

        Assert.False(valid);
        // A blank code short-circuits before hashing — the repo is never hit.
        _inviteCodes.Verify(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task IsInviteCodeRedeemable_WhenUnknownCode_ReturnsFalse_AndNeverConsumes()
    {
        _inviteCodes.Setup(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync((InviteCode?)null);

        var valid = await CreateSut(requireInviteCode: true).IsInviteCodeRedeemableAsync("BAD-CODE");

        Assert.False(valid);
        _inviteCodes.Verify(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task IsInviteCodeRedeemable_WhenRedeemableCode_ReturnsTrue_AndNeverConsumes()
    {
        _inviteCodes.Setup(r => r.GetRedeemableByHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new InviteCode { Id = 1, CodeHash = "hash" });

        var valid = await CreateSut(requireInviteCode: true).IsInviteCodeRedeemableAsync("K7QM-3FXP-9T");

        Assert.True(valid);
        // Crucially, an advisory check must NOT spend the code.
        _inviteCodes.Verify(r => r.TryConsumeAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Login_WhenUserNotFound_ThrowsUnauthorized()
    {
        _users.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => CreateSut().LoginAsync(new LoginDTO { Email = "x@y.com", Password = "whatever" }));
    }

    [Fact]
    public async Task Login_WhenPasswordWrong_ThrowsUnauthorized()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "x@y.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("the-real-password"),
        };
        _users.Setup(r => r.GetByEmailAsync("x@y.com", It.IsAny<bool>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => CreateSut().LoginAsync(new LoginDTO { Email = "x@y.com", Password = "the-wrong-password" }));
    }

    [Fact]
    public async Task VerifyEmail_WithEmptyToken_ThrowsValidation()
    {
        await Assert.ThrowsAsync<AppValidationException>(
            () => CreateSut().VerifyEmailAsync(""));
    }

    [Fact]
    public async Task VerifyEmail_WithUnknownToken_ThrowsValidation()
    {
        _tokens.Setup(t => t.HashToken(It.IsAny<string>())).Returns("hash");
        _emailTokens.Setup(r => r.GetActiveByHashAsync("hash", It.IsAny<CancellationToken>()))
                    .ReturnsAsync((EmailVerificationToken?)null);

        await Assert.ThrowsAsync<AppValidationException>(
            () => CreateSut().VerifyEmailAsync("some-token"));
    }

    [Fact]
    public async Task Logout_WithNoToken_IsANoOpAndDoesNotThrow()
    {
        // Logging out without a refresh cookie should quietly succeed.
        await CreateSut().LogoutAsync(null);
        await CreateSut().LogoutAsync("");
    }
}
