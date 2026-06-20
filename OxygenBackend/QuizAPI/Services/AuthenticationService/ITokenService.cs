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

        /// <summary>
        /// Creates a one-time email-verification token. Returns the raw value (emailed to the user),
        /// its hash (persisted), and the expiry.
        /// </summary>
        (string rawToken, string tokenHash, DateTime expiresAt) GenerateEmailVerificationToken();

        /// <summary>SHA-256 hash of a raw token, used to look up the stored row.</summary>
        string HashToken(string rawToken);
    }
}
