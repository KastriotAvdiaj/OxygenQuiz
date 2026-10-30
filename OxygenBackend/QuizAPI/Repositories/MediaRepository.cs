using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Media;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IMediaRepository
    {
        /// <summary>Tracked, so an attach can stamp <see cref="MediaAsset.FirstAttachedAt"/> in the
        /// caller's own save.</summary>
        Task<MediaAsset?> GetAsync(Guid id, CancellationToken ct = default);
        Task<MediaAsset?> GetByHashAsync(string contentHash, CancellationToken ct = default);
        Task AddAsync(MediaAsset asset, CancellationToken ct = default);
        void Remove(MediaAsset asset);
        Task<int> SaveChangesAsync(CancellationToken ct = default);

        /// <summary>Uploads by this account that no save has used yet.</summary>
        Task<int> CountUnsavedAsync(Guid uploaderId, CancellationToken ct = default);

        /// <summary>Attachments charged to this account's content since <paramref name="since"/>.</summary>
        Task<int> CountChargedSinceAsync(Guid ownerId, DateTime since, CancellationToken ct = default);

        /// <summary>Total stored size of the distinct assets this account's content points at.</summary>
        Task<long> SumReferencedBytesAsync(Guid ownerId, CancellationToken ct = default);

        /// <summary>Whether any of this account's questions or quizzes — other than the one being
        /// saved — already points at the asset. Re-using an image costs nothing.</summary>
        Task<bool> IsUsedByOwnerAsync(Guid ownerId, Guid assetId, int? exceptQuestionId, int? exceptQuizId, CancellationToken ct = default);

        /// <summary>Never-saved uploads created before <paramref name="createdBefore"/> that nothing
        /// points at — the sweep's 24-hour case.</summary>
        Task<List<MediaAsset>> ListNeverAttachedAsync(DateTime createdBefore, int take, CancellationToken ct = default);

        /// <summary>Once-saved assets nothing points at and the sweep hasn't stamped yet.</summary>
        Task<List<MediaAsset>> ListNewlyUnreferencedAsync(int take, CancellationToken ct = default);

        /// <summary>Stamped assets still unreferenced since before <paramref name="since"/> — the
        /// sweep's 7-day case.</summary>
        Task<List<MediaAsset>> ListUnreferencedSinceAsync(DateTime since, int take, CancellationToken ct = default);

        /// <summary>Stamped assets that something points at again, so the stamp can be cleared.</summary>
        Task<List<MediaAsset>> ListStampedButReferencedAsync(int take, CancellationToken ct = default);
    }
}

namespace QuizAPI.Repositories
{
    using QuizAPI.Repositories.Interfaces;

    /// <summary>
    /// Every query ignores the global query filters. The question filter decides what the
    /// <i>current caller</i> may read — but whether an asset is in use, or what an account's
    /// content weighs, is a fact about the database, and the sweep runs with no caller at all.
    /// Soft-deleted quizzes count as references: an admin can still surface them, and a deleted
    /// quiz's cover costing a few KB until it is purged is the safe side to err on.
    /// </summary>
    public sealed class MediaRepository(ApplicationDbContext db) : IMediaRepository
    {
        public Task<MediaAsset?> GetAsync(Guid id, CancellationToken ct = default) =>
            db.MediaAssets.FirstOrDefaultAsync(a => a.Id == id, ct);

        public Task<MediaAsset?> GetByHashAsync(string contentHash, CancellationToken ct = default) =>
            db.MediaAssets.FirstOrDefaultAsync(a => a.ContentHash == contentHash, ct);

        public async Task AddAsync(MediaAsset asset, CancellationToken ct = default) =>
            await db.MediaAssets.AddAsync(asset, ct);

        public void Remove(MediaAsset asset) => db.MediaAssets.Remove(asset);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);

        public Task<int> CountUnsavedAsync(Guid uploaderId, CancellationToken ct = default) =>
            db.MediaAssets.CountAsync(a => a.UploadedById == uploaderId && a.FirstAttachedAt == null && a.RemovedAt == null, ct);

        public async Task<int> CountChargedSinceAsync(Guid ownerId, DateTime since, CancellationToken ct = default)
        {
            var questions = await db.Questions.IgnoreQueryFilters()
                .CountAsync(q => q.UserId == ownerId && q.MediaCountedAt >= since, ct);
            var quizzes = await db.Quizzes.IgnoreQueryFilters()
                .CountAsync(q => q.UserId == ownerId && q.CoverCountedAt >= since, ct);
            return questions + quizzes;
        }

        public async Task<long> SumReferencedBytesAsync(Guid ownerId, CancellationToken ct = default)
        {
            var fromQuestions = db.Questions.IgnoreQueryFilters()
                .Where(q => q.UserId == ownerId && q.MediaAssetId != null)
                .Select(q => q.MediaAssetId!.Value);
            var fromQuizzes = db.Quizzes.IgnoreQueryFilters()
                .Where(q => q.UserId == ownerId && q.CoverAssetId != null)
                .Select(q => q.CoverAssetId!.Value);
            var ids = fromQuestions.Union(fromQuizzes);

            return await db.MediaAssets
                .Where(a => ids.Contains(a.Id))
                .SumAsync(a => (long?)a.ByteSize, ct) ?? 0;
        }

        public async Task<bool> IsUsedByOwnerAsync(Guid ownerId, Guid assetId, int? exceptQuestionId, int? exceptQuizId, CancellationToken ct = default) =>
            await db.Questions.IgnoreQueryFilters()
                .AnyAsync(q => q.UserId == ownerId && q.MediaAssetId == assetId && q.Id != exceptQuestionId, ct)
            || await db.Quizzes.IgnoreQueryFilters()
                .AnyAsync(q => q.UserId == ownerId && q.CoverAssetId == assetId && q.Id != exceptQuizId, ct);

        // Removed assets (moderation tombstones) are never listed: they hold no bytes, and their
        // row is what stops the same file being uploaded again.
        private IQueryable<MediaAsset> Unreferenced() =>
            db.MediaAssets.Where(a => a.RemovedAt == null
                && !db.Questions.IgnoreQueryFilters().Any(q => q.MediaAssetId == a.Id)
                && !db.Quizzes.IgnoreQueryFilters().Any(q => q.CoverAssetId == a.Id));

        public Task<List<MediaAsset>> ListNeverAttachedAsync(DateTime createdBefore, int take, CancellationToken ct = default) =>
            Unreferenced().Where(a => a.FirstAttachedAt == null && a.CreatedAt < createdBefore)
                .OrderBy(a => a.CreatedAt).Take(take).ToListAsync(ct);

        public Task<List<MediaAsset>> ListNewlyUnreferencedAsync(int take, CancellationToken ct = default) =>
            Unreferenced().Where(a => a.FirstAttachedAt != null && a.UnreferencedSince == null)
                .OrderBy(a => a.CreatedAt).Take(take).ToListAsync(ct);

        public Task<List<MediaAsset>> ListUnreferencedSinceAsync(DateTime since, int take, CancellationToken ct = default) =>
            Unreferenced().Where(a => a.UnreferencedSince != null && a.UnreferencedSince < since)
                .OrderBy(a => a.UnreferencedSince).Take(take).ToListAsync(ct);

        public Task<List<MediaAsset>> ListStampedButReferencedAsync(int take, CancellationToken ct = default) =>
            db.MediaAssets.Where(a => a.UnreferencedSince != null
                    && (db.Questions.IgnoreQueryFilters().Any(q => q.MediaAssetId == a.Id)
                        || db.Quizzes.IgnoreQueryFilters().Any(q => q.CoverAssetId == a.Id)))
                .Take(take).ToListAsync(ct);
    }
}
