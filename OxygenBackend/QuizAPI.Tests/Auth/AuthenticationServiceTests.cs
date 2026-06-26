using Microsoft.Extensions.Configuration;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.DTOs.Authentication;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.Email;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// Guard / negative-path tests for authentication. These cover the security-critical decisions —
/// rejecting duplicate signups, refusing bad credentials, and not trusting invalid verification
/// tokens. Dependencies are mocked, so no database or network is involved.
/// </summary>
public class AuthenticationServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRoleRepository> _roles = new();
    private readonly Mock<IRefreshTokenRepository> _refreshTokens = new();
    private readonly Mock<IEmailVerificationTokenRepository> _emailTokens = new();
    private readonly Mock<ITokenService> _tokens = new();
    private readonly Mock<IAuditService> _audit = new();
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IEmailSender> _email = new();
    private readonly Mock<IConfiguration> _config = new();

    private AuthenticationService CreateSut() => new(
        _users.Object, _roles.Object, _refreshTokens.Object, _emailTokens.Object,
        _tokens.Object, _audit.Object, _notifications.Object, _email.Object, _config.Object);

    private static SignupDTO ValidSignup() => new()
    {
        Email = "new@example.com",
        Username = "NewUser",
        Password = "a-strong-passphrase",
    };

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
