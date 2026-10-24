using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.DTOs.Media;
using QuizAPI.Exceptions;
using QuizAPI.Models.Media;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Media
{
    /// <summary>Credit for an image imported from an outside source (phase 3's picker, phase 4's
    /// AI). Null for the author's own uploads.</summary>
    public sealed record MediaImportCredit(
        MediaSource Source, string? Author, string? AuthorUrl, string? SourceUrl, string? License, string? LicenseUrl);

    public interface IMediaService
    {
        /// <summary>Checks, processes and stores an upload; returns the stored asset (an existing one
        /// when the same bytes were uploaded before). Nothing is attached and nothing counts against
        /// the quota until a save uses it.</summary>
        Task<MediaAssetDTO> UploadAsync(byte[] bytes, Guid uploaderId, MediaImportCredit? credit = null, CancellationToken ct = default);

        Task<MediaQuotaStatusDTO> GetQuotaStatusAsync(Guid userId, CancellationToken ct = default);
    }

    /// <summary>
    /// The upload half of the pipeline (docs/media/media-pipeline.md). The attach half — what a save
    /// does with an asset id, and the quota — is <see cref="MediaAttachmentService"/>.
    /// </summary>
    public sealed class MediaService(
        IMediaRepository media,
        IMediaStorage storage,
        IMediaQuotaPolicy quotas,
        IOptions<MediaOptions> options,
        TimeProvider clock,
        ILogger<MediaService> logger) : IMediaService
    {
        private readonly MediaOptions _o = options.Value;

        public async Task<MediaAssetDTO> UploadAsync(byte[] bytes, Guid uploaderId, MediaImportCredit? credit = null, CancellationToken ct = default)
        {
            if (bytes.Length == 0) throw new AppValidationException("The file is empty.");

            var kind = MediaProcessor.Sniff(bytes)
                ?? throw new AppValidationException("That file type isn't supported. Upload a JPEG, PNG or WebP image, or an MP3, M4A or OGG clip.");
            if (credit is not null && kind != MediaKind.Image)
                throw new AppValidationException("Only images can be imported from an outside source.");

            var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
            var now = clock.GetUtcNow().UtcDateTime;

            var existing = await media.GetByHashAsync(hash, ct);
            if (existing is not null)
            {
                if (existing.RemovedAt is not null)
                    throw new AppValidationException("This file was removed by moderators and can't be used.");
                // Someone is about to use these bytes, so restart whichever clock the sweep is
                // running on them: an unsaved file's 24 hours, or a once-used file's 7 days.
                if (existing.FirstAttachedAt is null) existing.CreatedAt = now;
                existing.UnreferencedSince = null;
                // The same bytes uploaded earlier by hand, now imported from their source: the
                // credit is owed either way, so the asset gains it. A credit is never removed.
                if (credit is not null && existing.Source == MediaSource.Upload) ApplyCredit(existing, credit);
                await media.SaveChangesAsync(ct);
                return ToDto(existing);
            }

            // Only new files count towards the unsaved pile; a duplicate adds nothing to storage.
            if (await media.CountUnsavedAsync(uploaderId, ct) >= _o.MaxUnsavedPerUser)
                throw new QuotaExceededException(
                    $"You have {_o.MaxUnsavedPerUser} uploads waiting to be saved. Save or remove some before uploading more.");

            var asset = new MediaAsset
            {
                Id = Guid.NewGuid(),
                ContentHash = hash,
                Kind = kind,
                UploadedById = uploaderId,
                CreatedAt = now,
            };
            if (credit is not null) ApplyCredit(asset, credit);

            var written = new List<string>();
            try
            {
                if (kind == MediaKind.Image)
                {
                    var image = MediaProcessor.ProcessImage(bytes, _o);
                    asset.StorageKey = $"images/{hash}.webp";
                    asset.ThumbKey = $"images/{hash}_{_o.ThumbEdge}.webp";
                    asset.ContentType = MediaProcessor.ImageContentType;
                    asset.ByteSize = image.Main.Length;
                    asset.Width = image.Width;
                    asset.Height = image.Height;
                    await storage.PutAsync(asset.StorageKey, image.Main, asset.ContentType, ct);
                    written.Add(asset.StorageKey);
                    await storage.PutAsync(asset.ThumbKey, image.Thumb, asset.ContentType, ct);
                    written.Add(asset.ThumbKey);
                    asset.ThumbUrl = storage.UrlFor(asset.ThumbKey);
                }
                else
                {
                    var audio = MediaProcessor.ProcessAudio(bytes, _o);
                    asset.StorageKey = $"audio/{hash}.{audio.Extension}";
                    asset.ContentType = audio.ContentType;
                    asset.ByteSize = audio.Bytes.Length;
                    asset.DurationMs = audio.DurationMs;
                    await storage.PutAsync(asset.StorageKey, audio.Bytes, asset.ContentType, ct);
                    written.Add(asset.StorageKey);
                }
                asset.Url = storage.UrlFor(asset.StorageKey);

                await media.AddAsync(asset, ct);
                await media.SaveChangesAsync(ct);
                return ToDto(asset);
            }
            catch (DbUpdateException)
            {
                // The same bytes uploaded twice at once: the unique hash index let one insert win.
                // Its objects have the same keys as ours, so they must not be deleted.
                var winner = await media.GetByHashAsync(hash, ct);
                if (winner is not null) return ToDto(winner);
                await DeleteQuietly(written);
                throw;
            }
            catch
            {
                await DeleteQuietly(written);
                throw;
            }
        }

        public async Task<MediaQuotaStatusDTO> GetQuotaStatusAsync(Guid userId, CancellationToken ct = default)
        {
            var quota = await quotas.GetQuotaAsync(userId, ct);
            var dayStart = MediaAttachmentService.DayStart(clock);
            return new MediaQuotaStatusDTO
            {
                DailyLimit = quota.DailyNew,
                UsedToday = await media.CountChargedSinceAsync(userId, dayStart, ct),
                StorageLimitBytes = quota.StorageBytes,
                StorageUsedBytes = await media.SumReferencedBytesAsync(userId, ct),
                ResetsAt = dayStart.AddDays(1),
            };
        }

        private async Task DeleteQuietly(IEnumerable<string> keys)
        {
            foreach (var key in keys)
            {
                try { await storage.DeleteAsync(key); }
                catch (Exception ex) { logger.LogWarning(ex, "Could not delete orphaned media object {Key}", key); }
            }
        }

        private static void ApplyCredit(MediaAsset asset, MediaImportCredit credit)
        {
            asset.Source = credit.Source;
            asset.CreditAuthor = Trim(credit.Author, 200);
            asset.CreditAuthorUrl = MediaCredits.SafeUrl(credit.AuthorUrl);
            asset.CreditSourceUrl = MediaCredits.SafeUrl(credit.SourceUrl);
            asset.CreditLicense = Trim(credit.License, 100);
            asset.CreditLicenseUrl = MediaCredits.SafeUrl(credit.LicenseUrl);
        }

        private static string? Trim(string? s, int max) =>
            string.IsNullOrWhiteSpace(s) ? null : (s.Length <= max ? s.Trim() : s[..max].Trim());

        public static MediaAssetDTO ToDto(MediaAsset a) => new()
        {
            Id = a.Id,
            Kind = a.Kind.ToString(),
            Url = a.Url,
            ThumbUrl = a.ThumbUrl,
            Width = a.Width,
            Height = a.Height,
            DurationMs = a.DurationMs,
            ByteSize = a.ByteSize,
            Credit = a.Source == MediaSource.Upload ? null : new MediaCreditDTO
            {
                Provider = MediaCredits.ProviderName(a.Source),
                Line = MediaCredits.Line(a) ?? string.Empty,
                Author = a.CreditAuthor,
                AuthorUrl = a.CreditAuthorUrl,
                SourceUrl = a.CreditSourceUrl,
                License = a.CreditLicense,
                LicenseUrl = a.CreditLicenseUrl,
            },
        };
    }
}
