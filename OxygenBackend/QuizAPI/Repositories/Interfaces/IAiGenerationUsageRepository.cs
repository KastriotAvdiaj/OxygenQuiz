using Microsoft.EntityFrameworkCore.Storage;
using QuizAPI.Models.Ai;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Data access for AI generation usage rows. Services never touch <c>DbContext</c>, so
    /// everything the quota logic needs — including the transaction and the per-user lock —
    /// is expressed here.
    /// </summary>
    public interface IAiGenerationUsageRepository
    {
        Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);

        /// <summary>
        /// Serialises quota checks for one user for the life of the current transaction.
        ///
        /// Without this, counting rows and then inserting one is a check-then-act race: two
        /// concurrent requests both read "4 used" against a cap of 5 and both proceed. The
        /// window is wide — a generation is seconds long — so this is a real bug, not a
        /// theoretical one.
        ///
        /// Implemented as a Postgres transaction-scoped advisory lock, and a no-op on other
        /// providers. Contention is per-user, so it costs nothing in practice.
        /// </summary>
        Task AcquireUserQuotaLockAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// Rows that occupy a quota slot for this user since <paramref name="sinceUtc"/>:
        /// everything except <see cref="Models.Ai.AiGenerationUsage.Status"/> = Released.
        /// </summary>
        Task<int> CountSlotsUsedSinceAsync(Guid userId, DateTime sinceUtc, CancellationToken ct = default);

        Task AddAsync(AiGenerationUsage usage, CancellationToken ct = default);

        /// <summary>Tracked lookup — the caller is about to mutate the row's status.</summary>
        Task<AiGenerationUsage?> GetTrackedByIdAsync(Guid id, CancellationToken ct = default);

        /// <summary>Total estimated spend since <paramref name="sinceUtc"/>, for the budget cap.</summary>
        Task<decimal> SumEstimatedCostSinceAsync(DateTime sinceUtc, CancellationToken ct = default);

        /// <summary>
        /// Releases reservations created before <paramref name="cutoffUtc"/> that never
        /// completed — a crashed request or a closed tab must not hold a slot forever.
        /// Returns how many were released.
        /// </summary>
        Task<int> ReleaseStaleReservationsAsync(DateTime cutoffUtc, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
