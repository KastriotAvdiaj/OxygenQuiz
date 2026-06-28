using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IInviteCodeRepository
    {
        Task AddRangeAsync(IEnumerable<InviteCode> codes, CancellationToken ct = default);

        /// <summary>Returns the redeemable (unconsumed, unrevoked, unexpired) code for this hash, or null.</summary>
        Task<InviteCode?> GetRedeemableByHashAsync(string codeHash, CancellationToken ct = default);

        /// <summary>
        /// Atomically marks the code consumed IFF it is still redeemable, in a single conditional
        /// UPDATE guarded by <c>ConsumedAt IS NULL</c>. Returns rows affected: 1 = success,
        /// 0 = already used/revoked/expired or lost a concurrent race. This is what guarantees the cap.
        /// </summary>
        Task<int> TryConsumeAsync(string codeHash, Guid userId, CancellationToken ct = default);

        Task<InviteCode?> GetByIdAsync(int id, CancellationToken ct = default);

        /// <summary>All codes (newest first) for the admin status view — never exposes plaintext.</summary>
        Task<IReadOnlyList<InviteCode>> ListAsync(CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
