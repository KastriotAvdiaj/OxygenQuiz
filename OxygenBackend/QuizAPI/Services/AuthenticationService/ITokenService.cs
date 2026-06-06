using QuizAPI.Models;

namespace QuizAPI.Services.AuthenticationService
{
    public interface ITokenService
    {
        string GenerateToken(User user, IReadOnlyCollection<string> roleNames);

        /// <summary>
        /// Creates a new opaque refresh token. Returns the raw value (sent to the client
        /// in an HttpOnly cookie), its hash (persisted), and the expiry.
        /// </summary>
        (string rawToken, string tokenHash, DateTime expiresAt) GenerateRefreshToken();

        /// <summary>SHA-256 hash of a raw refresh token, used to look up the stored row.</summary>
        string HashRefreshToken(string rawToken);
    }
}
