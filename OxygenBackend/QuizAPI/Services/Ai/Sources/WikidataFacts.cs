using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Ai.Sources
{
    public interface IWikidataFacts
    {
        /// <summary>
        /// The facts Wikidata holds about a Wikipedia article's subject, as lines for the prompt —
        /// or null when there are none, or Wikidata can't be reached in time. Never throws.
        /// </summary>
        Task<WikidataFactBlock?> ForArticleAsync(string languageName, string articleTitle, CancellationToken ct);
    }

    /// <param name="Text">"Facts from Wikidata about …:" and one "- property: value" line per fact.</param>
    public sealed record WikidataFactBlock(string ItemId, string Text, int Count);

    /// <summary>
    /// The structured facts behind a grounded article (docs/quiz/ai-quiz-generation-flow.md §2e,
    /// "Facts from Wikidata"). Every Wikipedia article is linked to a Wikidata item; its statements
    /// — capital, population, date of birth, notable work — are the numbers and names a model gets
    /// wrong most often, and an article's opening may not even state them.
    ///
    /// <para><b>Two calls to the entity API, not the query service.</b> <c>wbgetentities</c> takes
    /// the article's site and title (<c>sites=sqwiki&amp;titles=Shqipëria</c>) and answers in well
    /// under a second; the query service that fact packs use is throttled and slow (ADR 0040), and
    /// isn't needed for one known item. The second call fetches the names of the values and
    /// properties in the quiz's language.</para>
    ///
    /// <para><b>Which statements.</b> A fixed list of properties worth a quiz question
    /// (<see cref="Properties"/>) — never "everything": an item's statements are mostly
    /// identifiers. Best rank only; the latest dated value for a figure that changes (population);
    /// a value with no name in the quiz's language is left out rather than shown in another.</para>
    ///
    /// <para><b>Optional by design.</b> Grounding works without it. A timeout or error means the
    /// article goes alone, logged, and the author never sees a difference.</para>
    /// </summary>
    public sealed class WikidataFacts : IWikidataFacts
    {
        private const string Api = "https://www.wikidata.org/w/api.php";

        /// <summary>
        /// The properties asked about, in the order they're listed. Chosen for being asked in quizzes
        /// and for not changing under a cached answer: no office holders (head of state, coach),
        /// no noisy ones (occupation, citizenship — see docs/quiz/fact-quizzes.md).
        /// </summary>
        internal static readonly string[] Properties =
        {
            "P31",   // instance of
            "P17",   // country
            "P30",   // continent
            "P131",  // located in the administrative territorial entity
            "P36",   // capital
            "P1376", // capital of
            "P37",   // official language
            "P38",   // currency
            "P47",   // shares border with
            "P1082", // population
            "P2046", // area
            "P2044", // elevation above sea level
            "P2043", // length
            "P2048", // height
            "P885",  // origin of the watercourse
            "P403",  // mouth of the watercourse
            "P571",  // inception
            "P576",  // dissolved
            "P585",  // point in time
            "P276",  // location
            "P569",  // date of birth
            "P19",   // place of birth
            "P570",  // date of death
            "P20",   // place of death
            "P800",  // notable work
            "P50",   // author
            "P57",   // director
            "P86",   // composer
            "P175",  // performer
            "P577",  // publication date
            "P495",  // country of origin
            "P61",   // discoverer or inventor
            "P575",  // time of discovery or invention
            "P112",  // founded by
            "P159",  // headquarters location
            "P1346", // winner
        };

        /// <summary>No more than this many values per property: "shares border with" can list a dozen.</summary>
        private const int ValuesPerProperty = 5;

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly SourceOptions _options;
        private readonly ILogger<WikidataFacts> _logger;

        public WikidataFacts(HttpClient http, IMemoryCache cache, IOptions<SourceOptions> options, ILogger<WikidataFacts> logger)
        {
            _http = http ?? throw new ArgumentNullException(nameof(http));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<WikidataFactBlock?> ForArticleAsync(string languageName, string articleTitle, CancellationToken ct)
        {
            if (!_options.WikidataFacts.Enabled || string.IsNullOrWhiteSpace(articleTitle)) return null;
            if (!_options.LanguageDomains.TryGetValue(languageName, out var code)) return null;

            var key = $"wikidata:facts:{code}:{articleTitle.Trim().ToLowerInvariant()}";
            if (_cache.TryGetValue(key, out WikidataFactBlock? cached)) return cached;

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, _options.WikidataFacts.TimeoutSeconds)));
            try
            {
                var block = await FetchAsync(code, articleTitle.Trim(), timeout.Token);
                _cache.Set(key, block, TimeSpan.FromMinutes(Math.Max(1, _options.CacheMinutes)));
                return block;
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                _logger.LogInformation("Wikidata facts for {Title} timed out; the article goes alone.", articleTitle);
                return null;
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or KeyNotFoundException or InvalidOperationException)
            {
                _logger.LogWarning(ex, "Wikidata facts for {Title} failed; the article goes alone.", articleTitle);
                return null;
            }
        }

        private async Task<WikidataFactBlock?> FetchAsync(string code, string title, CancellationToken ct)
        {
            // 1. The item behind the article, and its statements.
            using var entities = await GetAsync(
                $"{Api}?action=wbgetentities&format=json&props=claims&normalize=1"
                + $"&sites={code}wiki&titles={Uri.EscapeDataString(title)}", ct);
            var entity = entities.RootElement.GetProperty("entities").EnumerateObject()
                .Select(e => e.Value)
                .FirstOrDefault(e => e.TryGetProperty("claims", out _));
            if (entity.ValueKind != JsonValueKind.Object) return null;
            var itemId = entity.GetProperty("id").GetString()!;
            var claims = entity.GetProperty("claims");

            var statements = new List<(string Property, List<Value> Values)>();
            foreach (var property in Properties)
            {
                if (!claims.TryGetProperty(property, out var list)) continue;
                var values = Best(list).Select(ReadValue).Where(v => v is not null).Select(v => v!)
                    // Albania's "country" is Albania: a fact about itself is no fact.
                    .Where(v => v.ItemId != itemId)
                    .Take(ValuesPerProperty).ToList();
                if (values.Count > 0) statements.Add((property, values));
            }
            if (statements.Count == 0) return null;

            // 2. Names — of the properties, the item values, and the units — in the quiz's language.
            var ids = statements.Select(s => s.Property)
                .Concat(statements.SelectMany(s => s.Values).SelectMany(v => new[] { v.ItemId, v.UnitId }))
                .Where(id => id is not null).Select(id => id!).Distinct().ToList();
            var names = await LabelsAsync(ids, code, ct);

            var lines = new List<string>();
            foreach (var (property, values) in statements)
            {
                if (!names.TryGetValue(property, out var propertyName)) continue;
                var shown = values.Select(v => v.Render(names)).Where(t => t is not null).Distinct().ToList();
                if (shown.Count == 0) continue;
                lines.Add($"- {propertyName}: {string.Join(", ", shown)}");
            }
            if (lines.Count == 0) return null;

            // Within budget, whole lines only: the first properties are the most asked about.
            var budget = Math.Max(200, _options.WikidataFacts.MaxChars);
            var header = $"Facts from Wikidata about \"{title}\":";
            var text = new StringBuilder(header);
            var count = 0;
            foreach (var line in lines)
            {
                if (text.Length + 1 + line.Length > budget) break;
                text.Append('\n').Append(line);
                count++;
            }
            return count == 0 ? null : new WikidataFactBlock(itemId, text.ToString(), count);
        }

        /// <summary>Preferred statements if there are any, else normal ones; never deprecated.</summary>
        private static IEnumerable<JsonElement> Best(JsonElement statements)
        {
            var all = statements.EnumerateArray().ToList();
            var preferred = all.Where(s => s.GetProperty("rank").GetString() == "preferred").ToList();
            var chosen = preferred.Count > 0 ? preferred : all.Where(s => s.GetProperty("rank").GetString() == "normal").ToList();
            // A figure that changes — population — keeps its most recent dated value first.
            return chosen.OrderByDescending(PointInTime);
        }

        private static string PointInTime(JsonElement statement) =>
            statement.TryGetProperty("qualifiers", out var q) && q.TryGetProperty("P585", out var p)
            && p[0].TryGetProperty("datavalue", out var dv)
                ? dv.GetProperty("value").GetProperty("time").GetString() ?? string.Empty
                : string.Empty;

        /// <summary>One statement's value, or null for a kind not shown (no value, coordinates, text).</summary>
        private static Value? ReadValue(JsonElement statement)
        {
            var snak = statement.GetProperty("mainsnak");
            if (snak.GetProperty("snaktype").GetString() != "value") return null;
            var data = snak.GetProperty("datavalue");
            var value = data.GetProperty("value");
            var year = PointInTime(statement) is { Length: > 5 } t ? t.Substring(1, 4) : null;

            return data.GetProperty("type").GetString() switch
            {
                "wikibase-entityid" => new Value { ItemId = value.GetProperty("id").GetString() },
                "time" => FormatTime(value) is { } when ? new Value { Text = when } : null,
                "quantity" => new Value
                {
                    Text = FormatAmount(value.GetProperty("amount").GetString()),
                    UnitId = UnitId(value.GetProperty("unit").GetString()),
                    Year = year,
                },
                _ => null,
            };
        }

        /// <summary>A date to its precision: 1936-01-28 for a day, 1912 for a year; coarser is left out.</summary>
        internal static string? FormatTime(JsonElement value)
        {
            var time = value.GetProperty("time").GetString();
            var precision = value.GetProperty("precision").GetInt32();
            if (time is null || time.Length < 11 || precision < 9) return null;
            var bc = time[0] == '-';
            var date = time.Substring(1, 10);
            var text = precision >= 11 ? date : precision == 10 ? date[..7] : date[..4].TrimStart('0');
            return bc ? $"{text} BC" : text;
        }

        internal static string? FormatAmount(string? amount)
        {
            if (!decimal.TryParse(amount?.TrimStart('+'), NumberStyles.Float, CultureInfo.InvariantCulture, out var n)) return null;
            // Whole numbers stay whole; the rest keep two decimals at most. No thousands separator —
            // English and Albanian write it differently, and the model reads "2402113" either way.
            return decimal.Round(n, n == decimal.Truncate(n) ? 0 : 2).ToString(CultureInfo.InvariantCulture);
        }

        private static string? UnitId(string? unit) =>
            unit is null || unit == "1" ? null : unit[(unit.LastIndexOf('/') + 1)..];

        private async Task<Dictionary<string, string>> LabelsAsync(List<string> ids, string code, CancellationToken ct)
        {
            var names = new Dictionary<string, string>(StringComparer.Ordinal);
            for (var i = 0; i < ids.Count; i += 50)
            {
                using var doc = await GetAsync(
                    $"{Api}?action=wbgetentities&format=json&props=labels&languages={code}"
                    + $"&ids={string.Join('|', ids.Skip(i).Take(50))}", ct);
                foreach (var entity in doc.RootElement.GetProperty("entities").EnumerateObject())
                    if (entity.Value.TryGetProperty("labels", out var labels) && labels.TryGetProperty(code, out var label))
                        names[entity.Name] = label.GetProperty("value").GetString()!;
            }
            return names;
        }

        private async Task<JsonDocument> GetAsync(string url, CancellationToken ct)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.TryAddWithoutValidation("User-Agent", _options.UserAgent);
            request.Headers.TryAddWithoutValidation("Accept", "application/json");
            using var response = await _http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                doc.Dispose();
                throw new HttpRequestException($"Wikidata answered an error: {error.GetRawText()}");
            }
            return doc;
        }

        private sealed class Value
        {
            public string? ItemId { get; init; }
            public string? Text { get; init; }
            public string? UnitId { get; init; }
            /// <summary>For a dated figure: "2402113 (2023)".</summary>
            public string? Year { get; init; }

            /// <summary>The value in words, or null when an item has no name in the language.</summary>
            public string? Render(IReadOnlyDictionary<string, string> names)
            {
                if (ItemId is not null) return names.TryGetValue(ItemId, out var name) ? name : null;
                if (Text is null) return null;
                var unit = UnitId is not null && names.TryGetValue(UnitId, out var u) ? $" {u}" : string.Empty;
                return Year is null ? Text + unit : $"{Text}{unit} ({Year})";
            }
        }
    }
}
