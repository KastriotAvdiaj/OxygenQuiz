using QuizAPI.Models;
using QuizAPI.Services.AuthenticationService.External;

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

        /// <summary>
        /// Mints the short-lived (10 min) signed ticket that bridges the two-step external
        /// signup: it carries the provider-verified {provider, sub, email, emailVerified} so
        /// the client can't tamper with them while collecting username + invite code. Uses a
        /// dedicated audience, so the JWT middleware can never mistake it for an access token.
        /// See docs/auth/social-login-plan.md §2.6.
        /// </summary>
        string GenerateExternalSignupTicket(ExternalIdentity identity);

        /// <summary>
        /// Validates a signup ticket (signature, lifetime, audience, purpose) and recovers the
        /// identity it carries. Returns null for anything invalid — including a genuine access
        /// token presented as a ticket.
        /// </summary>
        ExternalIdentity? ValidateExternalSignupTicket(string ticket);
    }
}
