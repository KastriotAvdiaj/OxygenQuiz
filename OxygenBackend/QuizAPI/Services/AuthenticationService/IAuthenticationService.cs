using QuizAPI.DTOs.Authentication;

namespace QuizAPI.Services.AuthenticationService
{
    public interface IAuthenticationService
    {
        Task<AuthResult> SignupAsync(SignupDTO dto, CancellationToken ct = default);
        Task<AuthResult> LoginAsync(LoginDTO dto, CancellationToken ct = default);

        /// <summary>
        /// Non-consuming check of whether an invite code is currently redeemable (real, unused,
        /// unrevoked, unexpired). Used for fast, up-front feedback on the signup form; it never
        /// spends the code. Returns false for a null/blank code. This is advisory only — signup
        /// still atomically re-validates and consumes the code, so a code that passes here can
        /// still lose a race at submit.
        /// </summary>
        Task<bool> IsInviteCodeRedeemableAsync(string? code, CancellationToken ct = default);

        /// <summary>Rotates the refresh token and mints a new access token. Throws UnauthorizedException if invalid.</summary>
        Task<AuthResult> RefreshAsync(string rawRefreshToken, CancellationToken ct = default);

        /// <summary>Revokes the supplied refresh token (idempotent).</summary>
        Task LogoutAsync(string? rawRefreshToken, CancellationToken ct = default);

        /// <summary>Confirms a user's email from a one-time token. Throws if it's invalid or expired.</summary>
        Task VerifyEmailAsync(string rawToken, CancellationToken ct = default);

        /// <summary>Re-issues and re-sends a verification email for the user. No-op if already confirmed.</summary>
        Task ResendVerificationAsync(Guid userId, CancellationToken ct = default);
    }
}
