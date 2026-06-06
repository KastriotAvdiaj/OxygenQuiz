using QuizAPI.DTOs.Authentication;

namespace QuizAPI.Services.AuthenticationService
{
    public interface IAuthenticationService
    {
        Task<AuthResult> SignupAsync(SignupDTO dto, CancellationToken ct = default);
        Task<AuthResult> LoginAsync(LoginDTO dto, CancellationToken ct = default);

        /// <summary>Rotates the refresh token and mints a new access token. Throws UnauthorizedException if invalid.</summary>
        Task<AuthResult> RefreshAsync(string rawRefreshToken, CancellationToken ct = default);

        /// <summary>Revokes the supplied refresh token (idempotent).</summary>
        Task LogoutAsync(string? rawRefreshToken, CancellationToken ct = default);
    }
}
