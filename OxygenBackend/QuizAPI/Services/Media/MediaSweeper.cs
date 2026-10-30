using Microsoft.Extensions.Options;
using QuizAPI.Models.Media;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Media
{
    /// <summary>
    /// Deletes stored files nothing points at (Hangfire, hourly). docs/media/media-pipeline.md,
    /// "A stored file is immutable, stored once, and swept when nothing points to it".
    ///
    /// <list type="bullet">
    /// <item><b>Never saved</b> — an editor upload that was replaced or abandoned: deleted
    /// <c>NeverAttachedGraceHours</c> (24) after upload.</item>
    /// <item><b>Saved once, now unused</b> — an image replaced, a question deleted: first stamped
    /// <see cref="MediaAsset.UnreferencedSince"/>, then deleted <c>DetachedGraceDays</c> (7) later.
    /// The grace covers a quiz still being played, a cached page and an author's undo.</item>
    /// </list>
    ///
    /// No reference count is kept anywhere: every run asks the database what points where, so a
    /// code path that forgets to "release" an asset can't leak or wrongly delete one.
    /// </summary>
    public sealed class MediaSweeper(
        IMediaRepository media,
        IMediaStorage storage,
        IOptions<MediaOptions> options,
        TimeProvider clock,
        ILogger<MediaSweeper> logger)
    {
        private readonly MediaOptions _o = options.Value;

        public sealed record Result(int DeletedNeverAttached, int Stamped, int DeletedDetached, int Unstamped);

        public async Task<Result> RunAsync(CancellationToken ct = default)
        {
            var now = clock.GetUtcNow().UtcDateTime;
            var batch = Math.Max(1, _o.SweepBatchSize);

            // Something points at a stamped asset again (an undo, a re-added image): un-stamp it.
            var revived = await media.ListStampedButReferencedAsync(batch, ct);
            foreach (var a in revived) a.UnreferencedSince = null;

            var stale = await media.ListNeverAttachedAsync(now.AddHours(-_o.NeverAttachedGraceHours), batch, ct);
            var expired = await media.ListUnreferencedSinceAsync(now.AddDays(-_o.DetachedGraceDays), batch, ct);
            foreach (var a in stale.Concat(expired)) media.Remove(a);

            var newlyUnused = await media.ListNewlyUnreferencedAsync(batch, ct);
            foreach (var a in newlyUnused) a.UnreferencedSince = now;

            // Rows first, bytes second. If a save attached one of these between the query and now,
            // its foreign key makes this SaveChanges fail and nothing is lost; deleting the objects
            // first would have left that save pointing at a file that no longer exists. The cost of
            // the order is the opposite failure — a row gone, its object not — which only wastes
            // storage, and is logged.
            await media.SaveChangesAsync(ct);
            await DeleteObjectsAsync(stale.Concat(expired), ct);

            var result = new Result(stale.Count, newlyUnused.Count, expired.Count, revived.Count);
            if (result != new Result(0, 0, 0, 0))
                logger.LogInformation(
                    "Media sweep: deleted {Never} never-saved and {Detached} unused files, stamped {Stamped}, un-stamped {Unstamped}",
                    result.DeletedNeverAttached, result.DeletedDetached, result.Stamped, result.Unstamped);
            return result;
        }

        /// <summary>Hangfire entry point.</summary>
        public Task RunJobAsync() => RunAsync();

        private async Task DeleteObjectsAsync(IEnumerable<MediaAsset> assets, CancellationToken ct)
        {
            foreach (var asset in assets)
            {
                foreach (var key in new[] { asset.StorageKey, asset.ThumbKey })
                {
                    if (key is null) continue;
                    try { await storage.DeleteAsync(key, ct); }
                    catch (Exception ex) { logger.LogWarning(ex, "Media sweep deleted the row but not the object {Key}", key); }
                }
            }
        }
    }
}
