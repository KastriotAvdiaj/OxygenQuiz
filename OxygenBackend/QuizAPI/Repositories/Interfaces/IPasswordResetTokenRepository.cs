using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IPasswordResetTokenRepository
    {
        Task AddAsync(PasswordResetToken token, CancellationToken ct = default);

        /// <summary>Returns the token row for this hash that is not consumed and not expired, or null.</summary>
        Task<PasswordResetToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default);

        /// <summary>
        /// Consumes every still-active token for a user. Called before issuing a new one, so
        /// requesting a second reset link silently kills the first — otherwise every request a
        /// user makes while confused leaves another live key to the account lying in an inbox.
        /// </summary>
        Task<int> InvalidateActiveForUserAsync(Guid userId, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
