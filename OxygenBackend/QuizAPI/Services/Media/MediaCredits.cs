using QuizAPI.Models.Media;

namespace QuizAPI.Services.Media
{
    /// <summary>
    /// The credit line an outside image carries wherever it renders (docs/media/media-pipeline.md,
    /// "Outside sources"). Built once, when a save attaches the asset, and copied onto the question
    /// or quiz beside its URL — so every screen that shows the image can show the credit without a
    /// join, the same way it shows the URL.
    /// </summary>
    public static class MediaCredits
    {
        public const int MaxLineLength = 300;
        public const int MaxUrlLength = 500;

        public static string ProviderName(MediaSource source) => source switch
        {
            MediaSource.Pexels => "Pexels",
            MediaSource.Wikimedia => "Wikimedia Commons",
            _ => string.Empty,
        };

        /// <summary>
        /// "Photo: Jane Doe / Pexels", or "Jane Doe · CC BY-SA 4.0 · Wikimedia Commons" — the licence
        /// is part of a Commons credit because CC BY requires it. Null for the author's own upload.
        /// </summary>
        public static string? Line(MediaAsset asset)
        {
            if (asset.Source == MediaSource.Upload) return null;
            var author = string.IsNullOrWhiteSpace(asset.CreditAuthor) ? "Unknown author" : asset.CreditAuthor.Trim();
            var line = asset.Source == MediaSource.Pexels
                ? $"Photo: {author} / Pexels"
                : string.Join(" · ", new[] { author, asset.CreditLicense, ProviderName(asset.Source) }
                    .Where(p => !string.IsNullOrWhiteSpace(p)));
            return line.Length <= MaxLineLength ? line : line[..MaxLineLength].TrimEnd();
        }

        /// <summary>Where the credit links to: the image's page at its source, which names the
        /// author and licence in full (what CC BY 4.0 §3(a)(2) accepts as attribution).</summary>
        public static string? Url(MediaAsset asset) =>
            asset.Source == MediaSource.Upload ? null : asset.CreditSourceUrl;

        /// <summary>An absolute https URL, or null. Credit links are rendered as links in the app, so
        /// nothing else — <c>javascript:</c>, <c>data:</c>, a relative path — is ever stored.</summary>
        public static string? SafeUrl(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var trimmed = value.Trim();
            if (trimmed.Length > MaxUrlLength) return null;
            return Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps
                ? uri.AbsoluteUri
                : null;
        }
    }
}
