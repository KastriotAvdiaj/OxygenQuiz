using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The provider against <b>real</b> MediaWiki responses, recorded on 2026-10-29
/// (<c>Fixtures/wikipedia-2026-10-29.json</c>; extracts cut to 20,000 characters to keep the file
/// small). The provider was first written without a compiler or a network, from documented shapes;
/// these are what pin it to what Wikipedia actually sends. Re-record when a test here starts
/// failing for a reason that isn't the code.
///
/// <para>A request with no recording answers 404, so a test that wanders off the recorded path
/// fails as "not found" rather than reaching the network.</para>
/// </summary>
public class WikipediaSourceProviderTests
{
    private static readonly JsonObject Recorded = JsonNode.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Ai", "Fixtures", "wikipedia-2026-10-29.json")))!.AsObject();

    /// <summary>Answers from the recording, keyed the way the capture script keyed it: kind|domain|titles-or-query.</summary>
    private sealed class Replay : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = new();
        public bool Offline { get; init; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Requests.Add(request);
            if (Offline) throw new HttpRequestException("offline");

            var uri = request.RequestUri!;
            var domain = uri.Host.Split('.')[0];
            var q = System.Web.HttpUtility.ParseQueryString(uri.Query);
            var key = q["list"] == "search" ? $"search|{domain}|{q["srsearch"]}"
                : q["prop"]?.Contains("pageprops") == true ? $"props|{domain}|{q["titles"]}"
                : q["prop"] == "extracts" ? $"extract|{domain}|{q["titles"]}"
                : $"exists|{domain}|{q["titles"]}";

            return Task.FromResult(Recorded.TryGetPropertyValue(key, out var body) && body is not null
                ? new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json"),
                }
                : new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }

    private static (WikipediaSourceProvider Provider, Replay Http) Build(bool offline = false)
    {
        var http = new Replay { Offline = offline };
        var provider = new WikipediaSourceProvider(
            new HttpClient(http),
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new SourceOptions { Enabled = true }),
            NullLogger<WikipediaSourceProvider>.Instance);
        return (provider, http);
    }

    // ── Lookup: the measured cases ──────────────────────────────────────────────────────────

    [Fact]
    public async Task A_clear_topic_is_selected_and_cut_to_the_budget_at_a_paragraph()
    {
        var (provider, _) = Build();

        var lookup = await provider.LookupAsync("Photosynthesis", "English", CancellationToken.None);

        Assert.Equal(SourceOutcome.Selected, lookup.Outcome);
        Assert.Equal("Photosynthesis", lookup.Title);
        Assert.StartsWith("https://en.wikipedia.org/wiki/Photosynthesis", lookup.Url);
        Assert.True(lookup.Text!.Length <= new SourceOptions().MaxSourceChars);
        Assert.StartsWith("Photosynthesis", lookup.Text);
        // Cut at a paragraph: the text ends where a paragraph of the article ended.
        var full = Recorded["extract|en|Photosynthesis"]!["query"]!["pages"]!.AsObject().First().Value!["extract"]!.GetValue<string>();
        Assert.Equal('\n', full[lookup.Text.Length]);
    }

    [Fact]
    public async Task An_explicit_disambiguation_page_puts_the_choice_to_the_author()
    {
        var (provider, _) = Build();

        var lookup = await provider.LookupAsync("Mercury", "English", CancellationToken.None);

        Assert.Equal(SourceOutcome.NeedsDisambiguation, lookup.Outcome);
        var titles = lookup.Candidates.Select(c => c.Title).ToList();
        Assert.Contains("Mercury (planet)", titles);
        Assert.Contains("Mercury (element)", titles);
        Assert.DoesNotContain("Mercury", titles); // the disambiguation page itself is never a source
    }

    [Fact]
    public async Task A_stub_with_a_longer_runner_up_asks_and_offers_the_real_article()
    {
        // "Historia e Kosovës" is 276 words; "Beteja e Kosovës" 433 trips the close-contest rule,
        // and the offer includes "Historia moderne e Kosovës" at 5,943 — the article worth using.
        var (provider, _) = Build();

        var lookup = await provider.LookupAsync("Historia e Kosovës", "Albanian", CancellationToken.None);

        Assert.Equal(SourceOutcome.NeedsDisambiguation, lookup.Outcome);
        Assert.Contains(lookup.Candidates, c => c.Title == "Historia moderne e Kosovës" && c.Words > 5000);
    }

    // ── Fetch: the author's pick ────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_picked_article_is_fetched_by_title()
    {
        var (provider, _) = Build();

        var lookup = await provider.FetchAsync("Mercury (planet)", "English", CancellationToken.None);

        Assert.Equal(SourceOutcome.Selected, lookup.Outcome);
        Assert.Equal("Mercury (planet)", lookup.Title);
        Assert.StartsWith("https://en.wikipedia.org/wiki/Mercury_", lookup.Url);
        Assert.Contains("Mercury", lookup.Text);
    }

    [Fact]
    public async Task Picking_a_stub_does_not_make_it_long_enough()
    {
        var (provider, _) = Build();

        var lookup = await provider.FetchAsync("Historia e Kosovës", "Albanian", CancellationToken.None);

        Assert.Equal(SourceOutcome.TooThin, lookup.Outcome);
        Assert.True(lookup.Words < new SourceOptions().MinSourceWords);
    }

    // ── Title checks: the language tiebreak ─────────────────────────────────────────────────

    [Theory]
    [InlineData("Futbolli", "Albanian", true)]
    [InlineData("Futbolli", "English", false)]
    [InlineData("Chemistry", "English", true)]
    [InlineData("Chemistry", "Albanian", false)]
    [InlineData("Python", "English", true)]   // a disambiguation page still exists
    [InlineData("Python", "Albanian", true)]  // the snake
    public async Task A_title_exists_in_the_editions_that_have_it(string title, string language, bool expected)
    {
        var (provider, _) = Build();

        Assert.Equal(expected, await provider.HasTitleAsync(title, language, CancellationToken.None));
    }

    // ── Never fatal, and polite ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task An_unreachable_wikipedia_is_an_outcome_not_an_exception()
    {
        var (provider, _) = Build(offline: true);

        Assert.Equal(SourceOutcome.Unavailable, (await provider.LookupAsync("Photosynthesis", "English", CancellationToken.None)).Outcome);
        Assert.Equal(SourceOutcome.Unavailable, (await provider.FetchAsync("Photosynthesis", "English", CancellationToken.None)).Outcome);
        Assert.False(await provider.HasTitleAsync("Chemistry", "English", CancellationToken.None));
    }

    [Fact]
    public async Task Every_request_names_itself_and_repeats_come_from_the_cache()
    {
        // Wikimedia answers an anonymous agent with 429, and two 429s came back inside a dozen
        // probe requests when this was measured — the cache is load-bearing.
        var (provider, http) = Build();

        await provider.LookupAsync("Photosynthesis", "English", CancellationToken.None);
        var first = http.Requests.Count;
        await provider.LookupAsync("Photosynthesis", "English", CancellationToken.None);

        Assert.All(http.Requests, r => Assert.Contains("OxygenQuiz", r.Headers.UserAgent.ToString()));
        Assert.Equal(first, http.Requests.Count);
    }

    [Fact]
    public void The_budget_cuts_at_a_word_when_the_first_paragraph_is_too_long()
    {
        var text = string.Join(' ', Enumerable.Repeat("photosynthesis", 100)); // one long paragraph

        var cut = WikipediaSourceProvider.TrimToBudget(text, 200);

        Assert.True(cut.Length <= 200);
        Assert.EndsWith("photosynthesis", cut);
    }
}
