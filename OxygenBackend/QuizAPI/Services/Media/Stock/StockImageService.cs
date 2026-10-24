using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using QuizAPI.DTOs.Media;
using QuizAPI.Exceptions;

namespace QuizAPI.Services.Media.Stock
{
    public interface IStockImageService
    {
        IReadOnlyList<StockProviderDTO> Providers();
        Task<StockSearchResultDTO> SearchAsync(string provider, string? query, int page, CancellationToken ct = default);
        Task<MediaAssetDTO> ImportAsync(Guid userId, StockImportCM cm, CancellationToken ct = default);

        /// <summary>
        /// The image for an AI-written question's search phrase: the best Commons result, else the
        /// best Pexels one, imported exactly as a pick would be. NotFound when neither has a usable one.
        /// </summary>
        Task<MediaAssetDTO> AutoImportAsync(Guid userId, string? query, CancellationToken ct = default);
    }

    /// <summary>
    /// Search Pexels and Wikimedia Commons from the editor, and import a chosen image into our own
    /// storage (docs/media/media-pipeline.md, "Outside sources").
    ///
    /// <para><b>The import takes a provider and an id — never a URL, never a credit.</b> The server
    /// asks the provider about that id, downloads from the one host the provider declares, and
    /// records the credit the provider gave. A client can't make the server fetch an arbitrary URL
    /// (SSRF), and can't attach a made-up credit or licence to an image. The bytes then go through
    /// <see cref="IMediaService.UploadAsync"/> like any upload: sniffed, re-encoded, deduplicated,
    /// counted towards the unsaved pile, and charged to the quota only when saved.</para>
    /// </summary>
    public sealed class StockImageService(
        IEnumerable<IStockImageProvider> providers,
        IMediaService media,
        IHttpClientFactory httpFactory,
        IMemoryCache cache,
        IOptions<StockImageOptions> options) : IStockImageService
    {
        public const string DownloadClient = "stock-download";
        public const int MaxQueryLength = 100;
        public const int MaxPage = 20;

        private readonly StockImageOptions _o = options.Value;
        private readonly Dictionary<string, IStockImageProvider> _providers =
            providers.ToDictionary(p => p.Id, StringComparer.OrdinalIgnoreCase);

        public IReadOnlyList<StockProviderDTO> Providers() =>
            _providers.Values.Select(p => new StockProviderDTO { Id = p.Id, Name = p.Name, Enabled = p.Enabled }).ToList();

        public async Task<StockSearchResultDTO> SearchAsync(string provider, string? query, int page, CancellationToken ct = default)
        {
            var source = Resolve(provider);
            var q = (query ?? string.Empty).Trim();
            if (q.Length == 0) throw new AppValidationException("Type something to search for.");
            if (q.Length > MaxQueryLength) throw new AppValidationException($"Keep the search under {MaxQueryLength} characters.");
            if (page < 1 || page > MaxPage) throw new AppValidationException($"Pages run from 1 to {MaxPage}.");

            var key = $"stock:{source.Id}:{q.ToLowerInvariant()}:{page}";
            if (cache.TryGetValue(key, out StockSearchResultDTO? hit) && hit is not null) return hit;

            var result = await source.SearchAsync(q, page, ct);
            // The grid loads these in the author's browser: only https previews from the source's
            // own image host, so a strange answer can't turn the picker into a tracker or a
            // mixed-content page.
            result.Items = result.Items.Where(i => IsOnHost(i.ThumbUrl, source.DownloadHost)).ToList();
            cache.Set(key, result, TimeSpan.FromMinutes(_o.SearchCacheMinutes));
            return result;
        }

        public async Task<MediaAssetDTO> ImportAsync(Guid userId, StockImportCM cm, CancellationToken ct = default)
        {
            var source = Resolve(cm.Provider);
            if (string.IsNullOrWhiteSpace(cm.Id) || cm.Id.Length > 40)
                throw new AppValidationException("Choose an image to import.");

            var detail = await source.GetAsync(cm.Id.Trim(), ct)
                ?? throw new NotFoundException("That image isn't available any more, or its licence doesn't allow reuse.");

            var url = detail.DownloadUrl;
            if (!IsOnHost(url.AbsoluteUri, source.DownloadHost))
                throw new AppValidationException("That image can't be imported.");

            var bytes = await DownloadAsync(url, ct);
            return await media.UploadAsync(bytes, userId, detail.Credit, ct);
        }

        /// <summary>Commons first: AI images are for factual subjects (flags, landmarks, artworks),
        /// which is what Commons holds; Pexels is the fallback for everyday ones.</summary>
        public static readonly string[] AutoOrder = { "wikimedia", "pexels" };

        public async Task<MediaAssetDTO> AutoImportAsync(Guid userId, string? query, CancellationToken ct = default)
        {
            ServiceUnavailableException? unavailable = null;
            foreach (var id in AutoOrder)
            {
                if (!_providers.TryGetValue(id, out var source) || !source.Enabled) continue;
                try
                {
                    var page = await SearchAsync(id, query, 1, ct);
                    // A result can still fail at import (its licence changed, its file is too big
                    // or not an image we take): try the next few before giving up on this source.
                    foreach (var candidate in page.Items.Take(3))
                    {
                        try { return await ImportAsync(userId, new StockImportCM { Provider = id, Id = candidate.Id }, ct); }
                        catch (NotFoundException) { }
                        catch (AppValidationException) when (!ct.IsCancellationRequested) { }
                    }
                }
                catch (ServiceUnavailableException e) { unavailable = e; }
            }
            if (unavailable is not null) throw unavailable;
            throw new NotFoundException("No free image was found for that.");
        }

        private static bool IsOnHost(string? url, string host) =>
            Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && string.Equals(uri.Host, host, StringComparison.OrdinalIgnoreCase);

        private IStockImageProvider Resolve(string? provider)
        {
            if (string.IsNullOrWhiteSpace(provider) || !_providers.TryGetValue(provider, out var source))
                throw new AppValidationException("Search Wikimedia Commons or Pexels.");
            if (!source.Enabled) throw new ServiceUnavailableException($"{source.Name} isn't set up on this site.");
            return source;
        }

        /// <summary>Reads at most <see cref="StockImageOptions.MaxDownloadBytes"/>; the client follows
        /// no redirects (a redirect could leave the declared host).</summary>
        private async Task<byte[]> DownloadAsync(Uri url, CancellationToken ct)
        {
            var http = httpFactory.CreateClient(DownloadClient);
            using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode)
                throw new ServiceUnavailableException("The image couldn't be downloaded from its source. Try another.");
            if (response.Content.Headers.ContentLength > _o.MaxDownloadBytes)
                throw new AppValidationException("That image is too large to import.");

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var buffer = new MemoryStream();
            var chunk = new byte[81920];
            int read;
            while ((read = await stream.ReadAsync(chunk, ct)) > 0)
            {
                if (buffer.Length + read > _o.MaxDownloadBytes)
                    throw new AppValidationException("That image is too large to import.");
                buffer.Write(chunk, 0, read);
            }
            return buffer.ToArray();
        }
    }
}
