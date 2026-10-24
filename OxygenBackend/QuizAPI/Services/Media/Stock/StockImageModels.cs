namespace QuizAPI.Services.Media.Stock
{
    /// <summary>Settings for the outside image sources (docs/media/media-pipeline.md, "Outside sources").</summary>
    public sealed class StockImageOptions
    {
        public const string Section = "Media:Stock";

        /// <summary>Pexels API key. Blank switches Pexels off — the picker offers Wikimedia only.</summary>
        public string PexelsApiKey { get; set; } = string.Empty;

        /// <summary>
        /// How Wikimedia can reach whoever runs this site — sent in the User-Agent, which their API
        /// policy requires ("…; https://site or email"). A request without one may be blocked.
        /// </summary>
        public string WikimediaContact { get; set; } = "https://oxygenquiz.com";

        /// <summary>
        /// Optional Wikimedia API access token (api.wikimedia.org → personal API token). Anonymous
        /// requests share a per-IP limit, which a cloud host's address can already have spent —
        /// Commons then answers 429. With a token the limit is the token's own.
        /// </summary>
        public string WikimediaAccessToken { get; set; } = string.Empty;

        /// <summary>Results per page in the picker.</summary>
        public int PageSize { get; set; } = 24;

        /// <summary>How long a search's results are reused. Pexels allows 200 requests an hour for
        /// the whole site, so two authors searching "Paris" should cost one.</summary>
        public int SearchCacheMinutes { get; set; } = 60;

        /// <summary>The largest image we'll download from a source before giving up.</summary>
        public long MaxDownloadBytes { get; set; } = 15L * 1024 * 1024;

        /// <summary>Long edge requested from the source; the pipeline caps stored images at 1600.</summary>
        public int DownloadEdge { get; set; } = 1600;
    }

    /// <summary>One search result: enough for the picker's grid. The import names it by provider and id only.</summary>
    public sealed class StockImageDTO
    {
        public string Provider { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
        /// <summary>A small preview served by the source itself — the picker shows it; nothing stores it.</summary>
        public string ThumbUrl { get; set; } = string.Empty;
        public int Width { get; set; }
        public int Height { get; set; }
        public string? Title { get; set; }
        public string? Author { get; set; }
        public string? License { get; set; }
    }

    public sealed class StockSearchResultDTO
    {
        public List<StockImageDTO> Items { get; set; } = new();
        public int Page { get; set; }
        public bool HasMore { get; set; }
    }

    public sealed class StockProviderDTO
    {
        /// <summary>"wikimedia" or "pexels" — what search and import take.</summary>
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool Enabled { get; set; }
    }

    public sealed class StockImportCM
    {
        public string Provider { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
    }

    /// <summary>What a provider says about one image when asked by id: where to download it, and the
    /// credit — both from the source, never from the client.</summary>
    public sealed record StockImageDetail(Uri DownloadUrl, MediaImportCredit Credit);
}
