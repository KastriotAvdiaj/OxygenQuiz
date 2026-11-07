using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>
    /// Microsoft Learn, for the topics Wikipedia covers badly: Microsoft's own languages, tools
    /// and services, and anything newer than the last encyclopedia edit ("New features in C# 12").
    /// English only — the Albanian Learn site doesn't exist, and an English page writing Albanian
    /// questions is the translation §4d rejects.
    ///
    /// <para><b>Through Learn's MCP server, as plain JSON-RPC.</b> <c>learn.microsoft.com/api/mcp</c>
    /// is Microsoft's published, keyless way for software to read Learn (no charge, no sign-in, its
    /// use under the Learn Terms of Use). It has two tools that matter: a semantic search, which
    /// put the right page first on every technical probe topic where the site search did not, and a
    /// fetch that returns the page as clean Markdown. Both answer a single stateless
    /// <c>tools/call</c>, so there is no MCP client library here, and no session.</para>
    ///
    /// <para><b>What is let through.</b> Documentation pages on learn.microsoft.com only. The
    /// documentation repositories behind them (dotnet/docs, azure-docs, sql-docs, PowerShell-Docs)
    /// are published under CC BY 4.0, so a link to the page is the attribution, as with Wikipedia.
    /// Excluded, because that does not hold or because they make poor quiz material: Q&amp;A threads
    /// (<c>/answers/</c> — other people's posts), training modules and shows (a separate licence),
    /// generated API reference (<c>/api/</c> — member lists), and anything on another host (the
    /// search also returns GitHub READMEs). docs/proposals/topic-disambiguation-and-source-tiers.md.</para>
    ///
    /// <para><b>Pages are read to be weighed.</b> The search gives no length, and its titles are
    /// unreliable (it returns "The history of C" for <i>The history of C#</i>), so the best few
    /// hits whose titles share a word with the topic are fetched — in parallel, cached — and judged
    /// by the page's own heading and length with the same <see cref="SourceSelection"/> rule as
    /// Wikipedia. Measured 2026-10-30: about 0.5–0.9 s per call, so a lookup costs one search plus
    /// one round of fetches, inside the generation's tens of seconds.</para>
    /// </summary>
    public sealed class MicrosoftLearnSourceProvider : IQuizSourceProvider
    {
        public const string ProviderName = "microsoft-learn";

        /// <summary>How many hits are fetched to be weighed. Each is a call; four covers the cases probed.</summary>
        private const int PagesToWeigh = 4;

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly SourceOptions _options;
        private readonly ILogger<MicrosoftLearnSourceProvider> _logger;

        public MicrosoftLearnSourceProvider(
            HttpClient http,
            IMemoryCache cache,
            IOptions<SourceOptions> options,
            ILogger<MicrosoftLearnSourceProvider> logger)
        {
            _http = http ?? throw new ArgumentNullException(nameof(http));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public string Name => ProviderName;

        public bool SupportsLanguage(string? languageName) =>
            _options.MicrosoftLearn.Enabled
            && string.Equals(languageName?.Trim(), "English", StringComparison.OrdinalIgnoreCase);

        public async Task<SourceLookup> LookupAsync(string topic, string? languageName, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(topic) || !SupportsLanguage(languageName)) return SourceLookup.NotFound;

            using var timeout = Budget(ct);
            try
            {
                var hits = await SearchAsync(topic.Trim(), timeout.Token);

                // Only hits that share a word with the topic are worth a fetch: Learn's search
                // answers "Photosynthesis" with Azure Quantum, confidently.
                var worth = hits
                    .Where(h => SourceSelection.Best(topic, Candidate(h.Title, 0, h.Url)).Overlap > 0)
                    .Take(PagesToWeigh)
                    .ToList();
                if (worth.Count == 0) return SourceLookup.NotFound;

                // And only pages that share as many words as a confident match needs are offered
                // at all. Learn's search always returns something, so with one shared word "World
                // War II in the Balkans" would offer <i>Gears of War: Reloaded</i> — measured
                // 2026-10-30. Wikipedia's results are kept looser; its search is lexical, so a
                // one-word overlap there is rarely this far off.
                var required = TitleMatch.RequiredOverlap(topic);
                var pages = await Task.WhenAll(worth.Select(h => FetchPageAsync(h.Url, timeout.Token)));
                var candidates = pages
                    .Where(p => p is not null)
                    .Select(p => Candidate(p!.Title, p.Words, p.Url))
                    .Where(c => SourceSelection.Best(topic, c).Overlap >= required)
                    .ToList();

                var decision = SourceSelection.Decide(topic, candidates, _options.MinSourceWords, _options.MaxCandidatesToOffer);
                switch (decision.Kind)
                {
                    case SourceDecisionKind.Ask:
                        return SourceLookup.NeedsDisambiguation(decision.Candidates);
                    case SourceDecisionKind.TooThin:
                        return SourceLookup.TooThin(decision.Chosen!.Title, decision.Chosen.Url, decision.Chosen.Words);
                    case SourceDecisionKind.Use:
                        var chosen = pages.First(p => p?.Url == decision.Chosen!.Key)!;
                        return SourceLookup.Selected(chosen.Title, chosen.Url, chosen.Text, chosen.Words, chosen.Url);
                    default:
                        return SourceLookup.NotFound;
                }
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning("Microsoft Learn lookup for {Topic} timed out.", topic);
                return SourceLookup.Unavailable;
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException)
            {
                _logger.LogWarning(ex, "Microsoft Learn lookup for {Topic} failed.", topic);
                return SourceLookup.Unavailable;
            }
        }

        /// <summary>The page the author picked, by its URL (<see cref="SourceCandidate.Key"/>).</summary>
        public async Task<SourceLookup> FetchAsync(string key, string? languageName, CancellationToken ct)
        {
            // The key comes back from the browser: anything but a Learn documentation page is not
            // fetched, so this can't be pointed at an arbitrary URL.
            var url = Normalise(key);
            if (url is null || !SupportsLanguage(languageName)) return SourceLookup.NotFound;

            using var timeout = Budget(ct);
            try
            {
                var page = await FetchPageAsync(url, timeout.Token);
                if (page is null) return SourceLookup.NotFound;
                return page.Words < _options.MinSourceWords
                    ? SourceLookup.TooThin(page.Title, page.Url, page.Words)
                    : SourceLookup.Selected(page.Title, page.Url, page.Text, page.Words, page.Url);
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning("Microsoft Learn fetch of {Url} timed out.", url);
                return SourceLookup.Unavailable;
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException)
            {
                _logger.LogWarning(ex, "Microsoft Learn fetch of {Url} failed.", url);
                return SourceLookup.Unavailable;
            }
        }

        /// <summary>
        /// Never. This is the tiebreak for which <i>language</i> a topic is in, and Learn is
        /// English-only — a title found there says nothing about English against Albanian.
        /// </summary>
        public Task<bool> HasTitleAsync(string title, string? languageName, CancellationToken ct) => Task.FromResult(false);

        /// <summary>
        /// A page as a candidate. Its address stands in as a second title, the way a redirect does
        /// on Wikipedia: Learn titles leave out what the section already says — "Entity Framework
        /// Core migrations" is a page called <i>Migrations Overview</i> at <c>/ef/core/…/migrations/</c>.
        /// </summary>
        private static SourceCandidate Candidate(string title, int words, string url) =>
            new(title, words) { Url = url, Provider = ProviderName, Key = url, RedirectTitle = PathWords(url) };

        /// <summary>"/ef/core/managing-schemas/migrations/" as "ef core managing schemas migrations".</summary>
        internal static string PathWords(string url) =>
            Uri.TryCreate(url, UriKind.Absolute, out var uri)
                ? string.Join(' ', uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries)
                    .Where(s => !Regex.IsMatch(s, "^[a-z]{2}-[a-z]{2}$"))
                    .Select(s => s.Replace('-', ' ')))
                : string.Empty;

        // ── Search and fetch ───────────────────────────────────────────────────────────────

        private sealed record Hit(string Title, string Url);

        private sealed record Page(string Title, string Url, string Text, int Words);

        private async Task<List<Hit>> SearchAsync(string topic, CancellationToken ct)
        {
            var key = $"learn:search:{topic.ToLowerInvariant()}";
            if (_cache.TryGetValue(key, out List<Hit>? cached) && cached is not null) return cached;

            var result = await CallAsync("microsoft_docs_search", new JsonObject { ["query"] = topic }, ct);
            var hits = new List<Hit>();
            foreach (var item in result["structuredContent"]?["results"]?.AsArray() ?? new JsonArray())
            {
                var url = Normalise(item?["contentUrl"]?.GetValue<string>());
                var title = item?["title"]?.GetValue<string>();
                // One page comes back as several chunks; the first chunk stands for the page.
                if (url is null || string.IsNullOrWhiteSpace(title) || hits.Any(h => h.Url == url)) continue;
                hits.Add(new Hit(CleanTitle(title), url));
            }

            _cache.Set(key, hits, TimeSpan.FromMinutes(Math.Max(1, _options.CacheMinutes)));
            return hits;
        }

        /// <summary>Null when Learn says the page can't be retrieved — the answer to a page that has gone.</summary>
        private async Task<Page?> FetchPageAsync(string url, CancellationToken ct)
        {
            var key = $"learn:page:{url}";
            if (_cache.TryGetValue(key, out Page? cached)) return cached;

            var result = await CallAsync("microsoft_docs_fetch", new JsonObject { ["url"] = url }, ct);
            var markdown = result["content"]?.AsArray()
                .Select(c => c?["text"]?.GetValue<string>())
                .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t));

            var page = Parse(url, markdown, _options.MaxSourceChars);
            _cache.Set(key, page, TimeSpan.FromMinutes(Math.Max(1, _options.CacheMinutes)));
            return page;
        }

        /// <summary>
        /// The page's heading, its text as the model reads it, and its length. A missing page comes
        /// back from the server as a sentence of prose ("could not be retrieved"), not an error, so
        /// a reply that doesn't open with a heading is treated as no page.
        /// </summary>
        private static Page? Parse(string url, string? markdown, int maxChars)
        {
            if (string.IsNullOrWhiteSpace(markdown)) return null;
            var text = CleanMarkdown(markdown);
            var heading = Regex.Match(text, @"\A#\s+(.+)$", RegexOptions.Multiline);
            if (!heading.Success) return null;

            var words = text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
            return new Page(heading.Groups[1].Value.Trim(), url, WikipediaSourceProvider.TrimToBudget(text, maxChars), words);
        }

        /// <summary>
        /// One <c>tools/call</c>, retried once — the same contract as Wikipedia's <c>GetAsync</c>:
        /// a failure throws <see cref="HttpRequestException"/>, which callers turn into
        /// <see cref="SourceOutcome.Unavailable"/>, never into "not found". The server answers in
        /// Streamable HTTP, which for a single call is one server-sent event; plain JSON is read too.
        /// </summary>
        private async Task<JsonNode> CallAsync(string tool, JsonObject arguments, CancellationToken ct)
        {
            var body = new JsonObject
            {
                ["jsonrpc"] = "2.0",
                ["id"] = 1,
                ["method"] = "tools/call",
                ["params"] = new JsonObject { ["name"] = tool, ["arguments"] = arguments },
            }.ToJsonString();

            for (var attempt = 1; ; attempt++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, _options.MicrosoftLearn.Endpoint)
                {
                    Content = new StringContent(body, Encoding.UTF8, "application/json"),
                };
                request.Headers.TryAddWithoutValidation("Accept", "application/json, text/event-stream");
                request.Headers.TryAddWithoutValidation("User-Agent", _options.UserAgent);

                using var response = await _http.SendAsync(request, ct);
                string failure;
                if (!response.IsSuccessStatusCode)
                {
                    failure = $"HTTP {(int)response.StatusCode}";
                }
                else
                {
                    var reply = ReadReply(await response.Content.ReadAsStringAsync(ct));
                    if (reply?["result"] is JsonNode result && result["isError"]?.GetValue<bool>() != true)
                        return result;
                    failure = reply?["error"]?["message"]?.GetValue<string>() ?? "an error";
                }

                _logger.LogWarning("Microsoft Learn answered {Failure} to {Tool} (attempt {Attempt}).", failure, tool, attempt);
                if (attempt >= 2) throw new HttpRequestException($"Microsoft Learn answered {failure}.");
                await Task.Delay(TimeSpan.FromMilliseconds(600), ct);
            }
        }

        /// <summary>The JSON-RPC reply: the last <c>data:</c> line of an event stream, or the body itself.</summary>
        internal static JsonNode? ReadReply(string raw)
        {
            var data = raw.Split('\n')
                .Select(l => l.TrimEnd('\r'))
                .Where(l => l.StartsWith("data:", StringComparison.Ordinal))
                .Select(l => l[5..].Trim())
                .LastOrDefault();
            return JsonNode.Parse(data ?? raw);
        }

        // ── Text ───────────────────────────────────────────────────────────────────────────

        private static readonly string[] ExcludedSegments = { "answers", "training", "shows", "samples", "api" };

        /// <summary>
        /// The page's address without its fragment, if it is a Learn documentation page at all;
        /// otherwise null. The search returns a section of a page as <c>page#section</c>.
        /// </summary>
        internal static string? Normalise(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)
                || !Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri)
                || uri.Scheme != Uri.UriSchemeHttps
                || !string.Equals(uri.Host, "learn.microsoft.com", StringComparison.OrdinalIgnoreCase))
                return null;

            var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0 || segments.Any(s => ExcludedSegments.Contains(s, StringComparer.OrdinalIgnoreCase)))
                return null;

            return uri.GetLeftPart(UriPartial.Query);
        }

        /// <summary>Search titles carry tab names: "Get started (programming-language-csharp)".</summary>
        internal static string CleanTitle(string title) =>
            Regex.Replace(title, @"\s*\((?:programming-language|tabs?|pivot)[^)]*\)", string.Empty).Trim();

        /// <summary>
        /// Markdown as prose: link text without its address, no images, no Learn callout markers
        /// (<c>[!NOTE]</c>) or <c>:::</c> directives. Code blocks stay — on a programming topic
        /// they are the material.
        /// </summary>
        internal static string CleanMarkdown(string markdown)
        {
            var text = markdown.Replace("\r\n", "\n");
            text = Regex.Replace(text, @"\A---\n.*?\n---\n", string.Empty, RegexOptions.Singleline);
            text = Regex.Replace(text, @"<!--.*?-->", string.Empty, RegexOptions.Singleline);
            text = Regex.Replace(text, @"!\[[^\]]*\]\([^)]*\)", string.Empty);
            text = Regex.Replace(text, @"\[([^\]]+)\]\([^)]*\)", "$1");
            text = Regex.Replace(text, @"^\s*:::.*$\n?", string.Empty, RegexOptions.Multiline);
            text = Regex.Replace(text, @"^>[ \t]*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n", string.Empty, RegexOptions.Multiline);
            text = Regex.Replace(text, @"\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*", string.Empty);
            text = Regex.Replace(text, @"\n{3,}", "\n\n");
            return text.Trim();
        }

        private CancellationTokenSource Budget(CancellationToken ct)
        {
            var source = CancellationTokenSource.CreateLinkedTokenSource(ct);
            source.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, _options.TimeoutSeconds)));
            return source;
        }
    }
}
