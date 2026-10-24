using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using QuizAPI.Exceptions;
using QuizAPI.Models.Media;

namespace QuizAPI.Services.Media.Stock
{
    /// <summary>
    /// Wikimedia Commons (https://commons.wikimedia.org/w/api.php): flags, landmarks, people,
    /// artworks — what quiz questions are mostly about. No key; a User-Agent naming the site is
    /// required by their API policy.
    ///
    /// <para><b>Only licences that allow reuse with credit</b> (<see cref="IsAllowedLicense"/>): public
    /// domain, CC0, CC BY and CC BY-SA. Anything non-commercial, no-derivatives, non-free or
    /// unrecognised is left out of the results — and checked again at import, because a search
    /// result is a hint, not a promise.</para>
    /// </summary>
    public sealed partial class WikimediaProvider(HttpClient http, IOptions<StockImageOptions> options) : IStockImageProvider
    {
        public const string ApiUrl = "https://commons.wikimedia.org/w/api.php";
        private const int ThumbEdge = 400;
        private const string MetadataFields = "LicenseShortName|LicenseUrl|Artist|ObjectName|NonFree";

        /// <summary>The thumbnail Commons renders is what we download, so the original's format only
        /// has to be one it can render as JPEG or PNG. GIF stays out: its thumbnail is a GIF, which
        /// the pipeline doesn't take.</summary>
        private static readonly HashSet<string> RenderableMimes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/tiff",
        };

        private readonly StockImageOptions _o = options.Value;

        public string Id => "wikimedia";
        public string Name => "Wikimedia Commons";
        public bool Enabled => true;
        /// <summary>Originals come from upload.wikimedia.org; since 2026 Commons serves its resized
        /// thumbnails — which is what we ask for and download — from thumb.wikimedia.org.</summary>
        public IReadOnlySet<string> DownloadHosts { get; } =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "upload.wikimedia.org", "thumb.wikimedia.org" };

        public async Task<StockSearchResultDTO> SearchAsync(string query, int page, CancellationToken ct)
        {
            var offset = (page - 1) * _o.PageSize;
            using var doc = await GetJsonAsync(
                "action=query&format=json&formatversion=2&generator=search&gsrnamespace=6" +
                $"&gsrsearch={Uri.EscapeDataString(query)}&gsrlimit={_o.PageSize}&gsroffset={offset}" +
                $"&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth={ThumbEdge}" +
                $"&iiextmetadatafilter={Uri.EscapeDataString(MetadataFields)}", ct);
            var root = doc.RootElement;

            var ranked = new List<(int Rank, StockImageDTO Item)>();
            foreach (var p in Pages(root))
            {
                var info = ImageInfo(p);
                if (info is not { } ii || !Usable(ii, out var license)) continue;
                var thumb = HttpsUrl(PexelsProvider.Str(ii, "thumburl"));
                if (thumb is null) continue;
                ranked.Add((p.TryGetProperty("index", out var idx) && idx.TryGetInt32(out var r) ? r : int.MaxValue, new StockImageDTO
                {
                    Provider = Id,
                    Id = p.GetProperty("pageid").GetRawText(),
                    ThumbUrl = thumb,
                    Width = Int(ii, "width"),
                    Height = Int(ii, "height"),
                    Title = TitleOf(p, ii),
                    Author = Meta(ii, "Artist") is { } artist ? PlainText(artist) : null,
                    License = license,
                }));
            }
            return new StockSearchResultDTO
            {
                Items = ranked.OrderBy(x => x.Rank).Select(x => x.Item).ToList(),
                Page = page,
                HasMore = root.TryGetProperty("continue", out _),
            };
        }

        public async Task<StockImageDetail?> GetAsync(string id, CancellationToken ct)
        {
            if (!long.TryParse(id, out var pageId) || pageId <= 0) return null;
            using var doc = await GetJsonAsync(
                $"action=query&format=json&formatversion=2&pageids={pageId}" +
                $"&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth={_o.DownloadEdge}" +
                $"&iiextmetadatafilter={Uri.EscapeDataString(MetadataFields)}", ct);

            var page = Pages(doc.RootElement).FirstOrDefault();
            if (page.ValueKind != JsonValueKind.Object) return null;
            if (!page.TryGetProperty("ns", out var ns) || ns.GetInt32() != 6) return null; // a File: page
            if (ImageInfo(page) is not { } ii || !Usable(ii, out var license)) return null;

            var download = HttpsUrl(PexelsProvider.Str(ii, "thumburl"));
            if (download is null || !Uri.TryCreate(download, UriKind.Absolute, out var downloadUri)) return null;

            var artist = Meta(ii, "Artist") is { } a ? PlainText(a) : null;
            return new StockImageDetail(downloadUri, new MediaImportCredit(
                MediaSource.Wikimedia,
                Author: string.IsNullOrWhiteSpace(artist) ? null : artist,
                AuthorUrl: null,
                SourceUrl: HttpsUrl(PexelsProvider.Str(ii, "descriptionurl")),
                License: license,
                LicenseUrl: HttpsUrl(Meta(ii, "LicenseUrl"))));
        }

        /// <summary>
        /// Whether a Commons licence lets us store, resize and show the image with a credit line:
        /// public domain, CC0, CC BY, CC BY-SA (any version or port). Not NC, not ND, not anything
        /// flagged non-free, and not anything we don't recognise — an unfamiliar licence is left out
        /// rather than guessed at.
        /// </summary>
        public static bool IsAllowedLicense(string? shortName, string? nonFree)
        {
            if (string.Equals(nonFree?.Trim(), "true", StringComparison.OrdinalIgnoreCase)) return false;
            if (string.IsNullOrWhiteSpace(shortName)) return false;
            var n = Regex.Replace(shortName.Trim().ToLowerInvariant(), @"\s+", " ").Replace("cc-by", "cc by");
            if (NonFreeTerms().IsMatch(n)) return false;
            return n.StartsWith("public domain") || n.StartsWith("pd") || n.StartsWith("cc0")
                || n.StartsWith("cc by ") || n == "cc by" || n.StartsWith("cc by-sa");
        }

        [GeneratedRegex(@"\b(nc|nd|non-commercial|noncommercial|no derivatives|fair use)\b")]
        private static partial Regex NonFreeTerms();

        /// <summary>Commons' Artist field is HTML (links, spans). The credit is plain text.</summary>
        public static string PlainText(string html)
        {
            var text = WebUtility.HtmlDecode(Regex.Replace(html, "<[^>]+>", " "));
            text = Regex.Replace(text, @"\s+", " ").Trim();
            // Commons often repeats a name in two languages' spans: "Unknown author Unknown author".
            var half = text.Length / 2;
            if (text.Length > 2 && text.Length % 2 == 1 && text[half] == ' ' && text[..half] == text[(half + 1)..])
                text = text[..half];
            return text.Length <= 200 ? text : text[..200].TrimEnd();
        }

        private static bool Usable(JsonElement ii, out string? license)
        {
            license = Meta(ii, "LicenseShortName")?.Trim();
            var mime = PexelsProvider.Str(ii, "mime");
            return mime is not null && RenderableMimes.Contains(mime) && IsAllowedLicense(license, Meta(ii, "NonFree"));
        }

        private static IEnumerable<JsonElement> Pages(JsonElement root) =>
            root.TryGetProperty("query", out var q) && q.TryGetProperty("pages", out var pages) && pages.ValueKind == JsonValueKind.Array
                ? pages.EnumerateArray().ToList()
                : Enumerable.Empty<JsonElement>();

        private static JsonElement? ImageInfo(JsonElement page) =>
            page.TryGetProperty("imageinfo", out var arr) && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0
                ? arr[0]
                : null;

        private static string? Meta(JsonElement ii, string key) => PexelsProvider.Str(ii, "extmetadata", key, "value");

        private static string? TitleOf(JsonElement page, JsonElement ii)
        {
            if (Meta(ii, "ObjectName") is { } name && !string.IsNullOrWhiteSpace(name)) return PlainText(name);
            var title = PexelsProvider.Str(page, "title");
            if (title is null) return null;
            title = title.StartsWith("File:") ? title[5..] : title;
            var dot = title.LastIndexOf('.');
            return dot > 0 ? title[..dot] : title;
        }

        /// <summary>
        /// MediaWiki expands its URLs to the protocol it thinks the request came in on, and some
        /// answers are protocol-relative (<c>//upload.wikimedia.org/…</c>) or plain http. Every
        /// Wikimedia host serves https, so the link — and the download, which must be https — is
        /// made https here rather than refused later.
        /// </summary>
        public static string? HttpsUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return url;
            if (url.StartsWith("//", StringComparison.Ordinal)) return "https:" + url;
            return url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ? "https://" + url[7..] : url;
        }

        private static int Int(JsonElement e, string key) =>
            e.TryGetProperty(key, out var v) && v.TryGetInt32(out var i) ? i : 0;

        private async Task<JsonDocument> GetJsonAsync(string query, CancellationToken ct)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{ApiUrl}?{query}");
            if (!string.IsNullOrWhiteSpace(_o.WikimediaAccessToken))
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _o.WikimediaAccessToken);
            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                throw new ServiceUnavailableException(response.StatusCode == HttpStatusCode.TooManyRequests
                    ? "Wikimedia Commons is busy right now — try again later, or search Pexels."
                    : "Wikimedia Commons couldn't be reached. Try again in a moment.");
            await using var body = await response.Content.ReadAsStreamAsync(ct);
            return await JsonDocument.ParseAsync(body, cancellationToken: ct);
        }

        public static void Configure(HttpClient client, StockImageOptions o)
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", $"OxygenQuiz/1.0 ({o.WikimediaContact})");
        }
    }
}
