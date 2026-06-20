using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IEmailVerificationTokenRepository
    {
        Task AddAsync(EmailVerificationToken token, CancellationToken ct = default);

        /// <summary>Returns the token row for this hash that is not consumed and not expired, or null.</summary>
        Task<EmailVerificationToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default);

        /// <summary>Consumes every still-active token for a user. Called before issuing a new one (resend).</summary>
        Task<int> InvalidateActiveForUserAsync(Guid userId, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
