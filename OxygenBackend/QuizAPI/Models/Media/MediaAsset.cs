using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models.Media
{
    /// <summary>What a stored file plays as. Video is designed for but not accepted yet
    /// (docs/media/media-pipeline.md, "Images and audio; video later").</summary>
    public enum MediaKind
    {
        Image = 1,
        Audio = 2,
    }

    /// <summary>Where a stored file came from. An external source carries a credit line that must
    /// be shown wherever the file renders.</summary>
    public enum MediaSource
    {
        Upload = 0,
        Pexels = 1,
        Wikimedia = 2,
    }

    /// <summary>
    /// One stored file in object storage (R2 in production, local disk in development and tests),
    /// shared by every question or quiz that points at it. See docs/media/media-pipeline.md.
    ///
    /// <para><b>Immutable once stored.</b> Replacing a question's image points the question at a
    /// different asset; nothing edits an asset's bytes. <b>Stored once:</b>
    /// <see cref="ContentHash"/> is the SHA-256 of the bytes that were uploaded, so the same file
    /// uploaded by three hundred authors is one row and one object. <b>Swept when nothing points
    /// to it</b> by <c>MediaSweeper</c> — there is no reference count to keep in step; the sweep
    /// asks the database.</para>
    /// </summary>
    public class MediaAsset
    {
        public Guid Id { get; set; }

        /// <summary>Lower-case hex SHA-256 of the original upload. Unique.</summary>
        [Required, MaxLength(64)]
        public string ContentHash { get; set; } = string.Empty;

        public MediaKind Kind { get; set; }

        public MediaSource Source { get; set; } = MediaSource.Upload;

        /// <summary>Object key of the file we serve, e.g. <c>images/{hash}.webp</c>.</summary>
        [Required, MaxLength(200)]
        public string StorageKey { get; set; } = string.Empty;

        /// <summary>
        /// Public URL of <see cref="StorageKey"/>, written once at upload. Stored rather than
        /// derived so read projections — translated to SQL — can copy it without knowing the
        /// storage configuration. Moving the media domain is one UPDATE.
        /// </summary>
        [Required, MaxLength(500)]
        public string Url { get; set; } = string.Empty;

        /// <summary>400px thumbnail for cards and editor lists. Images only.</summary>
        [MaxLength(200)]
        public string? ThumbKey { get; set; }

        [MaxLength(500)]
        public string? ThumbUrl { get; set; }

        /// <summary>Set by us from the decoded bytes, never taken from the client.</summary>
        [Required, MaxLength(100)]
        public string ContentType { get; set; } = string.Empty;

        /// <summary>Size of the stored file (not the upload) — what counts against storage.</summary>
        public long ByteSize { get; set; }

        public int? Width { get; set; }
        public int? Height { get; set; }
        public int? DurationMs { get; set; }

        /// <summary>Who uploaded it first. Not an owner: an asset belongs to whatever references it.
        /// Used to cap how many unsaved uploads one account can hold.</summary>
        public Guid? UploadedById { get; set; }

        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// When a save first pointed something at this asset. Null means it has never been saved
        /// anywhere — an editor upload that was replaced or abandoned — and the sweep removes it
        /// after <c>Media:NeverAttachedGraceHours</c>.
        /// </summary>
        public DateTime? FirstAttachedAt { get; set; }

        /// <summary>
        /// When the sweep first found a once-attached asset with nothing pointing at it. Cleared if
        /// something points at it again. Deleted after <c>Media:DetachedGraceDays</c> — the grace
        /// covers a quiz still being played, a cached page, and an author undoing a change.
        /// </summary>
        public DateTime? UnreferencedSince { get; set; }

        // ── Credit (external sources only) ─────────────────────────────────────────────────
        [MaxLength(200)] public string? CreditAuthor { get; set; }
        [MaxLength(500)] public string? CreditAuthorUrl { get; set; }
        [MaxLength(500)] public string? CreditSourceUrl { get; set; }
        [MaxLength(100)] public string? CreditLicense { get; set; }
        [MaxLength(500)] public string? CreditLicenseUrl { get; set; }

        /// <summary>
        /// Set when moderators remove the file. The object is deleted from storage but the row
        /// stays as a tombstone, so the same bytes can't simply be uploaded again.
        /// </summary>
        public DateTime? RemovedAt { get; set; }
    }
}
