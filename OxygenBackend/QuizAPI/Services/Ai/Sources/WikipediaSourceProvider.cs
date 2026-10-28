using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>
    /// Wikipedia, on the quiz's own language domain.
    ///
    /// <para><b>Three requests, not one.</b> The shapes were checked against the live API on
    /// 2026-10-28 and they do not combine:</para>
    /// <list type="number">
    ///   <item><c>list=search&amp;srprop=wordcount</c> — the only shape that returns word counts,
    ///     which both the thinness gate and the close-contest rule need.</item>
    ///   <item><c>prop=pageprops|info</c> over those titles — the disambiguation marker and the
    ///     canonical URL. Batches fine.</item>
    ///   <item><c>prop=extracts</c> for the <i>one</i> chosen title. <c>exlimit</c> does not batch:
    ///     asked for three pages it returns an extract for one, arbitrarily chosen, and empty
    ///     strings for the rest. Reading that as "the others are empty articles" is a trap, and
    ///     this provider walked into it before the shape was checked.</item>
    /// </list>
    ///
    /// <para>Everything is cached by (domain, topic) and (domain, title): Wikimedia answered two of
    /// a dozen probe requests with HTTP 429.</para>
    /// </summary>
    public sealed class WikipediaSourceProvider : IQuizSourceProvider
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly SourceOptions _options;
        private readonly ILogger<WikipediaSourceProvider> _logger;

        public WikipediaSourceProvider(
            HttpClient http,
            IMemoryCache cache,
            IOptions<SourceOptions> options,
            ILogger<WikipediaSourceProvider> logger)
        {
            _http = http ?? throw new ArgumentNullException(nameof(http));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public string Name => "wikipedia";

        public bool SupportsLanguage(string? languageName) => ResolveDomain(languageName) is not null;

        /// <summary>
        /// The Wikipedia subdomain for a quiz language, matched case-insensitively.
        ///
        /// <para>The comparison is done here rather than by giving the dictionary an
        /// <see cref="StringComparer.OrdinalIgnoreCase"/> comparer, because configuration binding
        /// builds its own dictionary and the comparer set in the options' initialiser is lost. The
        /// default initialiser looks case-insensitive and stops being so the moment anyone adds an
        /// <c>Ai:Source:LanguageDomains</c> section — which is a bug that only appears in
        /// deployments that configure it.</para>
        /// </summary>
        private string? ResolveDomain(string? languageName)
        {
            if (string.IsNullOrWhiteSpace(languageName)) return null;
            foreach (var pair in _options.LanguageDomains)
            {
                if (string.Equals(pair.Key, languageName, StringComparison.OrdinalIgnoreCase))
                    return string.IsNullOrWhiteSpace(pair.Value) ? null : pair.Value;
            }
            return null;
        }

        public async Task<SourceLookup> LookupAsync(string topic, string? languageName, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(topic)) return SourceLookup.NotFound;

            var domain = ResolveDomain(languageName);
            if (domain is null) return SourceLookup.NotFound;

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, _options.TimeoutSeconds)));

            try
            {
                var hits = await SearchAsync(domain, topic, timeout.Token);
                if (hits.Count == 0) return SourceLookup.NotFound;

                var flagged = await FlagDisambiguationAsync(domain, hits, timeout.Token);

                var decision = SourceSelection.Decide(
                    flagged,
                    _options.MinSourceWords,
                    _options.CloseContestRatio,
                    _options.MaxCandidatesToOffer);

                switch (decision.Kind)
                {
                    case SourceDecisionKind.NotFound:
                        return SourceLookup.NotFound;

                    case SourceDecisionKind.Ask:
                        return SourceLookup.NeedsDisambiguation(decision.Candidates);

                    case SourceDecisionKind.TooThin:
                        return SourceLookup.TooThin(
                            decision.Chosen!.Title, decision.Chosen.Url, decision.Chosen.Words);

                    default:
                        var chosen = decision.Chosen!;
                        var text = await ExtractAsync(domain, chosen.Title, timeout.Token);
                        // An article with a word count but no extract is a redirect or a deletion
                        // race. Ungrounded beats pretending.
                        if (string.IsNullOrWhiteSpace(text)) return SourceLookup.NotFound;
                        return SourceLookup.Selected(chosen.Title, chosen.Url, text, chosen.Words);
                }
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning("Wikipedia lookup for {Topic} on {Domain} timed out.", topic, domain);
                return SourceLookup.Unavailable;
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException)
            {
                // Never fatal: the generation carries on without a source.
                _logger.LogWarning(ex, "Wikipedia lookup for {Topic} on {Domain} failed.", topic, domain);
                return SourceLookup.Unavailable;
            }
        }

        // ── 1. Search ────────────────────────────────────────────────────────────────────────
        private async Task<List<SourceCandidate>> SearchAsync(string domain, string topic, CancellationToken ct)
        {
            var key = $"wiki:search:{domain}:{topic}";
            if (_cache.TryGetValue(key, out List<SourceCandidate>? cached) && cached is not null) return cached;

            var url = $"https://{domain}.wikipedia.org/w/api.php?action=query&format=json&list=search"
                + $"&srsearch={Uri.EscapeDataString(topic)}"
                + $"&srlimit={Math.Clamp(_options.SearchLimit, 1, 20)}&srprop=wordcount";

            var body = await GetAsync<SearchEnvelope>(url, ct);
            var results = body?.Query?.Search ?? new List<SearchHit>();
            var candidates = results
                .Where(h => !string.IsNullOrWhiteSpace(h.Title))
                .Select(h => new SourceCandidate(h.Title!, h.WordCount))
                .ToList();

            _cache.Set(key, candidates, TimeSpan.FromMinutes(_options.CacheMinutes));
            return candidates;
        }

        // ── 2. Disambiguation markers and canonical URLs ─────────────────────────────────────
        private async Task<List<SourceCandidate>> FlagDisambiguationAsync(
            string domain, List<SourceCandidate> candidates, CancellationToken ct)
        {
            var titles = string.Join("|", candidates.Select(c => c.Title));
            var key = $"wiki:props:{domain}:{titles}";
            if (_cache.TryGetValue(key, out List<SourceCandidate>? cached) && cached is not null) return cached;

            var url = $"https://{domain}.wikipedia.org/w/api.php?action=query&format=json"
                + $"&titles={Uri.EscapeDataString(titles)}&redirects=1"
                + "&prop=pageprops|info&ppprop=disambiguation&inprop=url";

            var body = await GetAsync<PropsEnvelope>(url, ct);
            var pages = body?.Query?.Pages?.Values ?? Enumerable.Empty<PropsPage>();

            // Keyed by title because the search and the props call agree on titles but not on
            // order, and `redirects=1` can rename one.
            var byTitle = pages
                .Where(p => !string.IsNullOrWhiteSpace(p.Title))
                .ToDictionary(p => p.Title!, StringComparer.OrdinalIgnoreCase);

            var merged = candidates
                .Select(c => byTitle.TryGetValue(c.Title, out var p)
                    ? c with { IsDisambiguation = p.PageProps is not null && p.PageProps.ContainsKey("disambiguation"), Url = p.FullUrl }
                    : c)
                .ToList();

            _cache.Set(key, merged, TimeSpan.FromMinutes(_options.CacheMinutes));
            return merged;
        }

        // ── 3. The extract, for exactly one title ────────────────────────────────────────────
        private async Task<string?> ExtractAsync(string domain, string title, CancellationToken ct)
        {
            var key = $"wiki:extract:{domain}:{title}";
            if (_cache.TryGetValue(key, out string? cached) && cached is not null) return cached;

            var url = $"https://{domain}.wikipedia.org/w/api.php?action=query&format=json"
                + $"&titles={Uri.EscapeDataString(title)}&redirects=1"
                + "&prop=extracts&explaintext=1&exlimit=1";

            var body = await GetAsync<ExtractEnvelope>(url, ct);
            var text = body?.Query?.Pages?.Values.FirstOrDefault()?.Extract;
            if (string.IsNullOrWhiteSpace(text)) return null;

            if (text.Length > _options.MaxSourceChars) text = text[.._options.MaxSourceChars];

            _cache.Set(key, text, TimeSpan.FromMinutes(_options.CacheMinutes));
            return text;
        }

        private async Task<T?> GetAsync<T>(string url, CancellationToken ct)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            // Wikimedia's policy: an anonymous agent is answered with 429.
            request.Headers.TryAddWithoutValidation("User-Agent", _options.UserAgent);
            request.Headers.TryAddWithoutValidation("Accept", "application/json");

            using var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Wikipedia returned {Status} for {Url}", (int)response.StatusCode, url);
                return default;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            return await JsonSerializer.DeserializeAsync<T>(stream, Json, ct);
        }

        // ── Wire types. Shapes verified against the live API on 2026-10-28 (formatversion 1,
        //    where `pages` is an object keyed by page id rather than an array). ───────────────
        private sealed class SearchEnvelope { public SearchQuery? Query { get; set; } }
        private sealed class SearchQuery { public List<SearchHit>? Search { get; set; } }
        private sealed class SearchHit
        {
            public string? Title { get; set; }
            [JsonPropertyName("wordcount")] public int WordCount { get; set; }
        }

        private sealed class PropsEnvelope { public PropsQuery? Query { get; set; } }
        private sealed class PropsQuery { public Dictionary<string, PropsPage>? Pages { get; set; } }
        private sealed class PropsPage
        {
            public string? Title { get; set; }
            [JsonPropertyName("pageprops")] public Dictionary<string, object>? PageProps { get; set; }
            [JsonPropertyName("fullurl")] public string? FullUrl { get; set; }
        }

        private sealed class ExtractEnvelope { public ExtractQuery? Query { get; set; } }
        private sealed class ExtractQuery { public Dictionary<string, ExtractPage>? Pages { get; set; } }
        private sealed class ExtractPage { public string? Extract { get; set; } }
    }
}
