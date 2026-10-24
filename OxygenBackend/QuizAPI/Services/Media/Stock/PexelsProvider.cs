using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using QuizAPI.Exceptions;
using QuizAPI.Models.Media;

namespace QuizAPI.Services.Media.Stock
{
    /// <summary>
    /// Pexels (https://www.pexels.com/api/documentation/): general photos under the Pexels License —
    /// free to use, credit asked as a condition of API access, and shown before Pexels lifts the
    /// 200-per-hour limit.
    /// </summary>
    public sealed class PexelsProvider(HttpClient http, IOptions<StockImageOptions> options) : IStockImageProvider
    {
        public const string ApiBase = "https://api.pexels.com/v1/";
        public const string LicenseName = "Pexels License";
        public const string LicenseUrl = "https://www.pexels.com/license/";

        private readonly StockImageOptions _o = options.Value;

        public string Id => "pexels";
        public string Name => "Pexels";
        public bool Enabled => !string.IsNullOrWhiteSpace(_o.PexelsApiKey);
        public string DownloadHost => "images.pexels.com";

        public async Task<StockSearchResultDTO> SearchAsync(string query, int page, CancellationToken ct)
        {
            using var doc = await GetJsonAsync(
                $"search?query={Uri.EscapeDataString(query)}&per_page={_o.PageSize}&page={page}", ct);
            var root = doc!.RootElement;
            var items = new List<StockImageDTO>();
            if (root.TryGetProperty("photos", out var photos))
                foreach (var p in photos.EnumerateArray())
                {
                    var thumb = Str(p, "src", "medium");
                    if (thumb is null) continue;
                    items.Add(new StockImageDTO
                    {
                        Provider = Id,
                        Id = p.GetProperty("id").GetRawText(),
                        ThumbUrl = thumb,
                        Width = Int(p, "width"),
                        Height = Int(p, "height"),
                        Title = Str(p, "alt"),
                        Author = Str(p, "photographer"),
                        License = LicenseName,
                    });
                }
            return new StockSearchResultDTO
            {
                Items = items,
                Page = page,
                HasMore = root.TryGetProperty("next_page", out var next) && next.ValueKind == JsonValueKind.String,
            };
        }

        public async Task<StockImageDetail?> GetAsync(string id, CancellationToken ct)
        {
            if (!long.TryParse(id, out var numeric) || numeric <= 0) return null;
            using var doc = await GetJsonAsync($"photos/{numeric}", ct, notFoundIsNull: true);
            if (doc is null) return null;
            var p = doc.RootElement;
            var original = Str(p, "src", "original");
            if (original is null || !Uri.TryCreate(original, UriKind.Absolute, out var originalUri)) return null;

            // Pexels serves resized copies through query parameters on the original's URL.
            var download = new UriBuilder(originalUri) { Query = $"auto=compress&cs=tinysrgb&w={_o.DownloadEdge}" }.Uri;
            return new StockImageDetail(download, new MediaImportCredit(
                MediaSource.Pexels,
                Author: Str(p, "photographer"),
                AuthorUrl: Str(p, "photographer_url"),
                SourceUrl: Str(p, "url"),
                License: LicenseName,
                LicenseUrl: LicenseUrl));
        }

        private async Task<JsonDocument?> GetJsonAsync(string path, CancellationToken ct, bool notFoundIsNull = false)
        {
            if (!Enabled) throw new ServiceUnavailableException("Pexels isn't set up on this site.");
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            // Pexels takes the bare key, not a Bearer token.
            request.Headers.TryAddWithoutValidation("Authorization", _o.PexelsApiKey);
            using var response = await http.SendAsync(request, ct);
            if (notFoundIsNull && response.StatusCode == HttpStatusCode.NotFound) return null;
            if (!response.IsSuccessStatusCode)
                throw new ServiceUnavailableException(
                    response.StatusCode == HttpStatusCode.TooManyRequests
                        ? "Pexels is busy right now — try again later, or search Wikimedia."
                        : "Pexels couldn't be reached. Try again in a moment.");
            await using var body = await response.Content.ReadAsStreamAsync(ct);
            return await JsonDocument.ParseAsync(body, cancellationToken: ct);
        }

        internal static string? Str(JsonElement e, params string[] path)
        {
            foreach (var key in path)
                if (e.ValueKind != JsonValueKind.Object || !e.TryGetProperty(key, out e)) return null;
            return e.ValueKind == JsonValueKind.String ? e.GetString() : null;
        }

        private static int Int(JsonElement e, string key) =>
            e.TryGetProperty(key, out var v) && v.TryGetInt32(out var i) ? i : 0;

        public static void Configure(HttpClient client)
        {
            client.BaseAddress = new Uri(ApiBase);
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
    }
}
