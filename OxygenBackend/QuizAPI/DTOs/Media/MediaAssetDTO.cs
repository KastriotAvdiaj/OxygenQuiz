namespace QuizAPI.DTOs.Media
{
    /// <summary>What an editor needs to preview a stored file and attach it on save.</summary>
    public sealed class MediaAssetDTO
    {
        public Guid Id { get; set; }

        /// <summary>"Image" or "Audio" — the same words as a question's <c>MediaType</c>.</summary>
        public string Kind { get; set; } = string.Empty;

        public string Url { get; set; } = string.Empty;
        public string? ThumbUrl { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public int? DurationMs { get; set; }
        public long ByteSize { get; set; }

        /// <summary>Null for the author's own uploads; set for Pexels / Wikimedia images, whose
        /// credit must be shown wherever they render.</summary>
        public MediaCreditDTO? Credit { get; set; }
    }

    public sealed class MediaCreditDTO
    {
        /// <summary>"Pexels" or "Wikimedia Commons".</summary>
        public string Provider { get; set; } = string.Empty;
        public string? Author { get; set; }
        public string? AuthorUrl { get; set; }
        public string? SourceUrl { get; set; }
        public string? License { get; set; }
        public string? LicenseUrl { get; set; }
    }

    /// <summary>The caller's media allowance, for the editor to show before an upload fails.</summary>
    public sealed class MediaQuotaStatusDTO
    {
        public int? DailyLimit { get; set; }
        public int UsedToday { get; set; }
        public long? StorageLimitBytes { get; set; }
        public long StorageUsedBytes { get; set; }
        public DateTime ResetsAt { get; set; }
    }
}
