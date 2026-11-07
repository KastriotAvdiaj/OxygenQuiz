using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The facts added under a grounded Wikipedia article, against <b>real</b> Wikidata answers for the
/// Albania article in English and Albanian (<c>Fixtures/wikidata-2026-11-05.json</c>). A request
/// with no recording is answered 429 — what Wikidata told this test's server once it had asked
/// enough — so the outage path is the default, not a special case.
/// </summary>
public class WikidataFactsTests
{
    private static readonly JsonObject Recorded = JsonNode.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Ai", "Fixtures", "wikidata-2026-11-05.json")))!.AsObject();

    private sealed class Replay : HttpMessageHandler
    {
        public int Calls;
        public TimeSpan Delay = TimeSpan.Zero;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++;
            if (Delay > TimeSpan.Zero) await Task.Delay(Delay, ct);
            var url = request.RequestUri!.AbsoluteUri;
            var body = Recorded.TryGetPropertyValue(url, out var recorded) ? recorded : Labels(request.RequestUri);
            return body is not null
                ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body.ToJsonString()) }
                : new HttpResponseMessage(HttpStatusCode.TooManyRequests) { Content = new StringContent("You are making too many requests to the API.") };
        }

        /// <summary>
        /// A names lookup answered by id from every recorded names answer in that language — the set
        /// of ids asked for depends on which statements survive, so matching whole URLs would make a
        /// recording break whenever a rule changes. Null when any id was never recorded.
        /// </summary>
        private static JsonObject? Labels(Uri uri)
        {
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            if (query["props"] != "labels") return null;
            var language = query["languages"]!;
            var known = Recorded
                .Where(r => r.Key.Contains("props=labels") && r.Key.Contains($"languages={language}"))
                .SelectMany(r => r.Value!["entities"]!.AsObject())
                .GroupBy(e => e.Key).ToDictionary(g => g.Key, g => g.First().Value);
            var ids = query["ids"]!.Split('|');
            if (ids.Any(id => !known.ContainsKey(id))) return null;
            return new JsonObject { ["entities"] = new JsonObject(ids.Select(id => KeyValuePair.Create(id, known[id]!.DeepClone()))) };
        }
    }

    private static (WikidataFacts Facts, Replay Http) Build(int maxChars = 800, bool enabled = true, Replay? replay = null)
    {
        var http = replay ?? new Replay();
        var options = new SourceOptions { Enabled = true, WikidataFacts = new() { Enabled = enabled, MaxChars = maxChars, TimeoutSeconds = 1 } };
        return (new WikidataFacts(new HttpClient(http), new MemoryCache(new MemoryCacheOptions()), Options.Create(options),
            NullLogger<WikidataFacts>.Instance), http);
    }

    [Fact]
    public async Task An_article_gets_its_subjects_facts_as_lines()
    {
        var block = await Build().Facts.ForArticleAsync("English", "Albania", default);

        Assert.NotNull(block);
        Assert.Equal("Q222", block!.ItemId);
        var lines = block.Text.Split('\n');
        Assert.Equal("Facts from Wikidata about \"Albania\":", lines[0]);
        Assert.Contains("- capital: Tirana", lines);
        Assert.Contains("- inception: 1912-11-28", lines);
        // The latest dated figure, with its year; the unit in words.
        Assert.Contains(lines, l => l.StartsWith("- population: ") && l.EndsWith(" (2023)"));
        Assert.Contains("- area: 28748 square kilometre", lines);
        Assert.Equal(lines.Length - 1, block.Count);
    }

    [Fact]
    public async Task A_fact_about_itself_is_left_out()
    {
        // Albania's "country" is Albania.
        var block = await Build().Facts.ForArticleAsync("English", "Albania", default);

        Assert.DoesNotContain("- country: Albania", block!.Text.Split('\n'));
    }

    [Fact]
    public async Task Names_come_in_the_quiz_language_and_a_value_without_one_is_left_out()
    {
        var block = await Build().Facts.ForArticleAsync("Albanian", "Shqipëria", default);

        var lines = block!.Text.Split('\n');
        Assert.Contains("- kryeqytet: Tirana", lines);
        Assert.Contains(lines, l => l.StartsWith("- sipërfaqja: 28748 kilometër katror"));
        // The lek has no Albanian label on Wikidata: no line rather than an English name.
        Assert.DoesNotContain(lines, l => l.Contains("lek", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task The_budget_is_kept_in_whole_lines()
    {
        var block = await Build(maxChars: 200).Facts.ForArticleAsync("English", "Albania", default);

        Assert.InRange(block!.Text.Length, 1, 200);
        Assert.All(block.Text.Split('\n').Skip(1), l => Assert.StartsWith("- ", l));
    }

    [Fact]
    public async Task Wikidata_refusing_means_no_facts_never_an_error()
    {
        var block = await Build().Facts.ForArticleAsync("English", "Ismail Kadare", default);

        Assert.Null(block);
    }

    [Fact]
    public async Task Wikidata_too_slow_means_no_facts()
    {
        var (facts, _) = Build(replay: new Replay { Delay = TimeSpan.FromSeconds(5) });

        Assert.Null(await facts.ForArticleAsync("English", "Albania", default));
    }

    [Fact]
    public async Task Off_or_in_a_language_with_no_Wikipedia_it_asks_nothing()
    {
        var (off, offHttp) = Build(enabled: false);
        var (on, onHttp) = Build();

        Assert.Null(await off.ForArticleAsync("English", "Albania", default));
        Assert.Null(await on.ForArticleAsync("German", "Albanien", default));
        Assert.Equal(0, offHttp.Calls + onHttp.Calls);
    }

    [Fact]
    public async Task Asking_twice_is_answered_from_the_cache()
    {
        var (facts, http) = Build();

        await facts.ForArticleAsync("English", "Albania", default);
        var calls = http.Calls;
        await facts.ForArticleAsync("English", "Albania", default);

        Assert.Equal(calls, http.Calls);
    }

    [Theory]
    [InlineData("+1912-11-28T00:00:00Z", 11, "1912-11-28")]
    [InlineData("+1936-01-00T00:00:00Z", 10, "1936-01")]
    [InlineData("+1443-00-00T00:00:00Z", 9, "1443")]
    [InlineData("-0335-00-00T00:00:00Z", 9, "335 BC")]
    [InlineData("+1900-00-00T00:00:00Z", 7, null)] // a century: too vague to ask about
    public void Dates_are_written_to_their_precision(string time, int precision, string? expected) =>
        Assert.Equal(expected, WikidataFacts.FormatTime(JsonDocument.Parse($"{{\"time\":\"{time}\",\"precision\":{precision}}}").RootElement));

    [Theory]
    [InlineData("+2811655", "2811655")]
    [InlineData("+28748.0", "28748")]
    [InlineData("+2764.537", "2764.54")]
    [InlineData("nonsense", null)]
    public void Amounts_are_written_plainly(string amount, string? expected) =>
        Assert.Equal(expected, WikidataFacts.FormatAmount(amount));
}

/// <summary>Where the facts meet grounding: only under a Wikipedia article, and never in the way.</summary>
public class QuizGroundingWikidataFactsTests
{
    private const string Article = "Fotosinteza është procesi me të cilin bimët prodhojnë ushqim nga drita e diellit.";

    private static Mock<IQuizSourceProvider> Provider(string name, string title)
    {
        var p = new Mock<IQuizSourceProvider>();
        p.SetupGet(x => x.Name).Returns(name);
        p.Setup(x => x.SupportsLanguage(It.IsAny<string?>())).Returns(true);
        p.Setup(x => x.LookupAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SourceLookup.Selected(title, "https://example.org", Article, 3000));
        p.Setup(x => x.HasTitleAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        return p;
    }

    private static QuizGrounding Grounding(Mock<IQuizSourceProvider> provider, IWikidataFacts? facts) =>
        new(new[] { provider.Object }, Options.Create(new SourceOptions { Enabled = true }), facts);

    [Fact]
    public async Task A_Wikipedia_article_gets_its_facts_below_it()
    {
        var facts = new Mock<IWikidataFacts>();
        facts.Setup(f => f.ForArticleAsync("Albanian", "Fotosinteza", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WikidataFactBlock("Q11982", "Facts from Wikidata about \"Fotosinteza\":\n- zbuluar: 1779", 1));

        var result = await Grounding(Provider("wikipedia", "Fotosinteza"), facts.Object)
            .GroundAsync("Fotosinteza", new GroundingAnswers("Albanian", null), default);

        Assert.Equal($"{Article}\n\nFacts from Wikidata about \"Fotosinteza\":\n- zbuluar: 1779", result.Source!.Text);
        Assert.Equal(1, result.Source.WikidataFacts);
    }

    [Fact]
    public async Task No_facts_leaves_the_article_as_it_was()
    {
        var facts = new Mock<IWikidataFacts>();
        facts.Setup(f => f.ForArticleAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WikidataFactBlock?)null);

        var result = await Grounding(Provider("wikipedia", "Fotosinteza"), facts.Object)
            .GroundAsync("Fotosinteza", new GroundingAnswers("Albanian", null), default);

        Assert.Equal(Article, result.Source!.Text);
        Assert.Equal(0, result.Source.WikidataFacts);
    }

    [Fact]
    public async Task A_Microsoft_Learn_page_is_not_given_Wikidata_facts()
    {
        var facts = new Mock<IWikidataFacts>();

        await Grounding(Provider(MicrosoftLearnSourceProvider.ProviderName, "What is Azure Functions?"), facts.Object)
            .GroundAsync("Azure Functions", new GroundingAnswers("English", null), default);

        facts.Verify(f => f.ForArticleAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
