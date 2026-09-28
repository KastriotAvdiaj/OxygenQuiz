using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IEmailChangeTokenRepository
    {
        Task AddAsync(EmailChangeToken token, CancellationToken ct = default);

        /// <summary>Returns the token row for this hash that is not consumed and not expired, or null.</summary>
        Task<EmailChangeToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default);

        /// <summary>The user's live pending change, if any — the newest unconsumed, unexpired row.</summary>
        Task<EmailChangeToken?> GetActiveForUserAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// Consumes every still-active token for a user. Called before issuing a new one (asking
        /// again replaces the pending address rather than leaving two live links) and after a
        /// successful change.
        /// </summary>
        Task<int> InvalidateActiveForUserAsync(Guid userId, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
