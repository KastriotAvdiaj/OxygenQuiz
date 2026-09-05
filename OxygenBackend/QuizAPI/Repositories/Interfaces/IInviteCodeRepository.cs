using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IInviteCodeRepository
    {
        Task AddRangeAsync(IEnumerable<InviteCode> codes, CancellationToken ct = default);

        /// <summary>
        /// Returns the redeemable (unconsumed, unrevoked, unexpired) code for this hash, or null.
        /// Includes <see cref="InviteCode.GrantedRole"/> — the signup path reads the granted role
        /// from this entity to build the new user's role set.
        /// </summary>
        Task<InviteCode?> GetRedeemableByHashAsync(string codeHash, CancellationToken ct = default);

        /// <summary>
        /// Atomically marks the code consumed IFF it is still redeemable AND unbound or bound to
        /// <paramref name="normalizedEmail"/>, in a single conditional UPDATE guarded by
        /// <c>ConsumedAt IS NULL</c>. Returns rows affected: 1 = success, 0 = already
        /// used/revoked/expired, wrong email, or lost a concurrent race. This is what guarantees
        /// the cap — and, for a bound code, that only the intended recipient can spend it.
        /// </summary>
        Task<int> TryConsumeAsync(
            string codeHash, Guid userId, string normalizedEmail, CancellationToken ct = default);

        Task<InviteCode?> GetByIdAsync(int id, CancellationToken ct = default);

        /// <summary>All codes (newest first) for the admin status view — never exposes plaintext.</summary>
        Task<IReadOnlyList<InviteCode>> ListAsync(CancellationToken ct = default);

        /// <summary>
        /// Usernames for the accounts that redeemed codes, in one round-trip. Ignores the
        /// soft-delete filter so a code stays attributable after its account is deleted.
        /// </summary>
        Task<IReadOnlyDictionary<Guid, string>> GetConsumerUsernamesAsync(
            IEnumerable<Guid> userIds, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
