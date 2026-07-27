using QuizAPI.DTOs.Authentication;

namespace QuizAPI.Services.AuthenticationService
{
    public interface IAuthenticationService
    {
        Task<AuthResult> SignupAsync(SignupDTO dto, CancellationToken ct = default);
        Task<AuthResult> LoginAsync(LoginDTO dto, CancellationToken ct = default);

        /// <summary>
        /// Signs in with a provider-issued ID token (Google/Microsoft). Verifies the token, then:
        /// known identity → logs in; verified email matching an existing account → links + logs in;
        /// otherwise → returns a signup-required outcome carrying a short-lived ticket.
        /// Throws UnauthorizedException for a bad token, ConflictException when the email matches
        /// an account but isn't provider-verified. See docs/auth/social-login-plan.md §5.1.
        /// </summary>
        Task<ExternalLoginOutcome> ExternalLoginAsync(ExternalLoginDTO dto, CancellationToken ct = default);

        /// <summary>
        /// Completes a first-time external signup from a signup ticket + chosen username
        /// (+ invite code while the gate is on). Mirrors SignupAsync's transactional semantics:
        /// the user, the identity link, and the consumed invite code commit together or not at
        /// all. See docs/auth/social-login-plan.md §5.2.
        /// </summary>
        Task<AuthResult> ExternalSignupAsync(ExternalSignupDTO dto, CancellationToken ct = default);

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
