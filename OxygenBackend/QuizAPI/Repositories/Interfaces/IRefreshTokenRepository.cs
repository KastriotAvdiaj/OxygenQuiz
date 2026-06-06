using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IRefreshTokenRepository
    {
        Task AddAsync(RefreshToken token, CancellationToken ct = default);

        /// <summary>Returns the token row for this hash that is not revoked and not expired, or null.</summary>
        Task<RefreshToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default);

        Task<int> RevokeAllForUserAsync(Guid userId, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
