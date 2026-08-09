using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using QuizAPI.Data;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;

namespace QuizAPI.Repositories
{
    public class AiGenerationUsageRepository : IAiGenerationUsageRepository
    {
        private readonly ApplicationDbContext _context;

        public AiGenerationUsageRepository(ApplicationDbContext context) => _context = context;

        public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default) =>
            await _context.Database.BeginTransactionAsync(ct);

        public async Task AcquireUserQuotaLockAsync(Guid userId, CancellationToken ct = default)
        {
            // Advisory locks are a Postgres feature. The Sqlite provider is referenced for tests,
            // where requests are sequential and the lock is unnecessary — so skip rather than throw.
            if (!_context.Database.IsNpgsql()) return;

            await _context.Database.ExecuteSqlRawAsync(
                "SELECT pg_advisory_xact_lock({0})", new object[] { ToLockKey(userId) }, ct);
        }

        public Task<int> CountSlotsUsedSinceAsync(Guid userId, DateTime sinceUtc, CancellationToken ct = default) =>
            _context.AiGenerationUsages
                .Where(u => u.UserId == userId
                            && u.CreatedAt >= sinceUtc
                            && u.Status != AiGenerationStatus.Released)
                .CountAsync(ct);

        public async Task AddAsync(AiGenerationUsage usage, CancellationToken ct = default) =>
            await _context.AiGenerationUsages.AddAsync(usage, ct);

        public Task<AiGenerationUsage?> GetTrackedByIdAsync(Guid id, CancellationToken ct = default) =>
            _context.AiGenerationUsages.FirstOrDefaultAsync(u => u.Id == id, ct);

        public async Task<decimal> SumEstimatedCostSinceAsync(DateTime sinceUtc, CancellationToken ct = default) =>
            await _context.AiGenerationUsages
                .Where(u => u.CreatedAt >= sinceUtc)
                .SumAsync(u => (decimal?)u.EstimatedCostUsd, ct) ?? 0m;

        public async Task<int> ReleaseStaleReservationsAsync(DateTime cutoffUtc, CancellationToken ct = default)
        {
            var stale = await _context.AiGenerationUsages
                .Where(u => u.Status == AiGenerationStatus.Reserved && u.CreatedAt < cutoffUtc)
                .ToListAsync(ct);

            foreach (var row in stale)
            {
                row.Status = AiGenerationStatus.Released;
                row.CompletedAt = DateTime.UtcNow;
                row.ErrorCode ??= "Abandoned";
            }

            return stale.Count;
        }

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);

        /// <summary>
        /// Folds a Guid into the bigint that <c>pg_advisory_xact_lock</c> takes. Collisions between
        /// two different users are possible and harmless: the only consequence is that those two
        /// users' quota checks briefly serialise against each other.
        /// </summary>
        private static long ToLockKey(Guid userId)
        {
            Span<byte> bytes = stackalloc byte[16];
            userId.TryWriteBytes(bytes);
            return BitConverter.ToInt64(bytes[..8]);
        }
    }
}
