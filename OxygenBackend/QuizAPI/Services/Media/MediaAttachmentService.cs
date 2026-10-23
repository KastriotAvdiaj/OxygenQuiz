using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Media;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Media
{
    public interface IMediaAttachmentService
    {
        /// <summary>
        /// Points the question at <paramref name="assetId"/> (or clears its media when null), charging
        /// <paramref name="saverId"/>'s quota if this is new media for them. Changes the tracked entity
        /// only; the caller's own SaveChanges persists it — so a save that fails afterwards charges
        /// nothing.
        /// </summary>
        Task ApplyToQuestionAsync(QuestionBase question, Guid? assetId, Guid saverId, CancellationToken ct = default);

        /// <summary>Same, for a quiz's cover. Images only.</summary>
        Task ApplyToQuizCoverAsync(Quiz quiz, Guid? assetId, Guid saverId, CancellationToken ct = default);
    }

    /// <summary>
    /// What a save does with an asset id — the only code that writes a question's media fields or a
    /// quiz's cover. docs/media/media-pipeline.md, "Quota counts what you save, not what you try".
    ///
    /// <para><b>The rule:</b> uploading costs nothing; a save that attaches media the saver isn't
    /// already using somewhere in their content is charged — one against today's count, its size
    /// against their storage. Attaching an asset they already use (a builder copy of a question, the
    /// same flag on two questions) is free. Keeping the same asset on an edit is not a new
    /// attachment at all.</para>
    ///
    /// <para><b>Scoped per request, and it keeps a tally.</b> The AI import attaches media to many
    /// questions before a single SaveChanges; the database can't see those yet, so this instance
    /// adds what it has charged in this request to what the database says.</para>
    /// </summary>
    public sealed class MediaAttachmentService(
        IMediaRepository media,
        IMediaQuotaPolicy quotas,
        TimeProvider clock) : IMediaAttachmentService
    {
        private readonly HashSet<Guid> _chargedThisRequest = new();
        private int _pendingCount;
        private long _pendingBytes;
        private MediaQuota? _quota;

        /// <summary>The quota day is UTC midnight to midnight, like the AI quota — a window anchored
        /// to the client's clock is one the client can move.</summary>
        public static DateTime DayStart(TimeProvider clock) => clock.GetUtcNow().UtcDateTime.Date;

        public async Task ApplyToQuestionAsync(QuestionBase question, Guid? assetId, Guid saverId, CancellationToken ct = default)
        {
            if (assetId == question.MediaAssetId) return;

            if (assetId is null)
            {
                question.MediaAssetId = null;
                question.MediaUrl = null;
                question.MediaType = QuestionMediaType.None;
                question.MediaCountedAt = null;
                return;
            }

            var asset = await LoadUsableAsync(assetId.Value, ct);
            var counted = await ChargeAsync(saverId, asset, exceptQuestionId: question.Id == 0 ? null : question.Id, exceptQuizId: null, ct);

            question.MediaAssetId = asset.Id;
            question.MediaUrl = asset.Url;
            question.MediaType = asset.Kind == MediaKind.Audio ? QuestionMediaType.Audio : QuestionMediaType.Image;
            question.MediaCountedAt = counted;
            MarkAttached(asset);
        }

        public async Task ApplyToQuizCoverAsync(Quiz quiz, Guid? assetId, Guid saverId, CancellationToken ct = default)
        {
            if (assetId == quiz.CoverAssetId) return;

            if (assetId is null)
            {
                quiz.CoverAssetId = null;
                quiz.ImageUrl = null;
                quiz.CoverCountedAt = null;
                return;
            }

            var asset = await LoadUsableAsync(assetId.Value, ct);
            if (asset.Kind != MediaKind.Image)
                throw new AppValidationException("A quiz cover must be an image.");

            var counted = await ChargeAsync(saverId, asset, exceptQuestionId: null, exceptQuizId: quiz.Id == 0 ? null : quiz.Id, ct);

            quiz.CoverAssetId = asset.Id;
            quiz.ImageUrl = asset.Url;
            quiz.CoverCountedAt = counted;
            MarkAttached(asset);
        }

        private async Task<MediaAsset> LoadUsableAsync(Guid assetId, CancellationToken ct)
        {
            var asset = await media.GetAsync(assetId, ct);
            if (asset is null)
                throw new AppValidationException("That image or audio clip is no longer available. Please upload it again.");
            if (asset.RemovedAt is not null)
                throw new AppValidationException("That file was removed by moderators and can't be used.");
            return asset;
        }

        private void MarkAttached(MediaAsset asset)
        {
            var now = clock.GetUtcNow().UtcDateTime;
            asset.FirstAttachedAt ??= now;
            asset.UnreferencedSince = null;
        }

        /// <summary>Returns when the attachment was charged, or null when it was free.</summary>
        private async Task<DateTime?> ChargeAsync(Guid saverId, MediaAsset asset, int? exceptQuestionId, int? exceptQuizId, CancellationToken ct)
        {
            if (_chargedThisRequest.Contains(asset.Id)
                || await media.IsUsedByOwnerAsync(saverId, asset.Id, exceptQuestionId, exceptQuizId, ct))
                return null;

            _quota ??= await quotas.GetQuotaAsync(saverId, ct);

            if (_quota.DailyNew is int daily)
            {
                var used = await media.CountChargedSinceAsync(saverId, DayStart(clock), ct) + _pendingCount;
                if (used >= daily)
                    throw new QuotaExceededException(
                        $"You've added {daily} new images or clips today, your daily limit. It resets at midnight UTC.");
            }

            if (_quota.StorageBytes is long storage)
            {
                var bytes = await media.SumReferencedBytesAsync(saverId, ct) + _pendingBytes;
                if (bytes + asset.ByteSize > storage)
                    throw new QuotaExceededException(
                        $"Your media storage is full ({storage / (1024 * 1024)} MB). Remove images from questions you no longer need to free space.");
            }

            _chargedThisRequest.Add(asset.Id);
            _pendingCount++;
            _pendingBytes += asset.ByteSize;
            return clock.GetUtcNow().UtcDateTime;
        }
    }
}
