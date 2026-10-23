namespace QuizAPI.Services.Media
{
    /// <summary>
    /// The <c>Media</c> configuration section. Every value has a default, so a fresh checkout runs
    /// on local disk with no configuration at all. See docs/deployment/configuration.md, "Media".
    /// </summary>
    public sealed class MediaOptions
    {
        public const string Section = "Media";

        /// <summary><c>Disk</c> (default) or <c>R2</c>. Development may use R2 via user-secrets;
        /// the unit tests and the E2E stack always use Disk.</summary>
        public string Storage { get; set; } = "Disk";

        public DiskStorageOptions Disk { get; set; } = new();
        public R2StorageOptions R2 { get; set; } = new();

        // ── What an upload may be ──────────────────────────────────────────────────────────
        /// <summary>Largest image accepted before re-encoding. Phone photos run 3–8 MB; what we
        /// store is a ≤1600px WebP far below this.</summary>
        public long ImageMaxSourceBytes { get; set; } = 10L * 1024 * 1024;

        /// <summary>Largest audio clip accepted, stored as uploaded.</summary>
        public long AudioMaxBytes { get; set; } = 10L * 1024 * 1024;

        /// <summary>The product rule for audio: a clip, not an album.</summary>
        public int AudioMaxSeconds { get; set; } = 60;

        /// <summary>Long edge of the stored image.</summary>
        public int ImageMaxEdge { get; set; } = 1600;

        /// <summary>Long edge of the thumbnail.</summary>
        public int ThumbEdge { get; set; } = 400;

        /// <summary>Refuse to decode an image whose header claims more pixels than this — a
        /// "decompression bomb" is a tiny file that expands to gigabytes in memory.</summary>
        public long MaxSourcePixels { get; set; } = 40_000_000;

        /// <summary>Refuse an image with either side longer than this, whatever its pixel count.</summary>
        public int MaxSourceEdge { get; set; } = 12_000;

        public int WebpQuality { get; set; } = 80;

        // ── Lifecycle ──────────────────────────────────────────────────────────────────────
        /// <summary>How long an upload that was never saved anywhere is kept.</summary>
        public int NeverAttachedGraceHours { get; set; } = 24;

        /// <summary>How long a once-saved file nothing points at any more is kept.</summary>
        public int DetachedGraceDays { get; set; } = 7;

        /// <summary>How many uploads one account may have waiting, unsaved, at once.</summary>
        public int MaxUnsavedPerUser { get; set; } = 50;

        /// <summary>How many assets one sweep run deletes at most, so a backlog can't make one run
        /// hold a long transaction.</summary>
        public int SweepBatchSize { get; set; } = 200;

        // ── Quotas by role (docs/media/media-pipeline.md, "Every signed-in user may upload") ──
        public MediaQuota UserQuota { get; set; } = new() { DailyNew = 15, StorageBytes = 100L * 1024 * 1024 };
        public MediaQuota StaffQuota { get; set; } = new() { DailyNew = 200, StorageBytes = 2560L * 1024 * 1024 };
    }

    public sealed class DiskStorageOptions
    {
        /// <summary>Folder for stored files, relative to the content root. Inside
        /// <c>wwwroot/uploads</c> because that folder is already a writable volume in Docker.</summary>
        public string RootPath { get; set; } = "wwwroot/uploads/media";

        /// <summary>Public base URL of <see cref="RootPath"/>. Empty means "this API's own origin +
        /// /uploads/media", taken from the request.</summary>
        public string PublicBaseUrl { get; set; } = "";
    }

    public sealed class R2StorageOptions
    {
        public string AccountId { get; set; } = "";
        public string AccessKeyId { get; set; } = "";
        public string SecretAccessKey { get; set; } = "";
        public string Bucket { get; set; } = "";

        /// <summary>The bucket's public hostname, e.g. <c>https://media.oxygenquiz.com</c> in
        /// production or the bucket's r2.dev URL in development.</summary>
        public string PublicBaseUrl { get; set; } = "";
    }

    public sealed class MediaQuota
    {
        /// <summary>New media saved per UTC day. Null = unlimited.</summary>
        public int? DailyNew { get; set; }

        /// <summary>Total bytes of distinct media in the account's content. Null = unlimited.</summary>
        public long? StorageBytes { get; set; }
    }
}
