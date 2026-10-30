using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The provider against <b>real</b> Learn MCP responses, recorded on 2026-10-30
/// (<c>Fixtures/learn-2026-10-30.json</c>). A call with no recording is answered with the server's
/// own "could not be retrieved" prose, so a test that wanders off the recorded path finds nothing
/// rather than reaching the network.
/// </summary>
public class MicrosoftLearnSourceProviderTests
{
    private static readonly JsonObject Recorded = JsonNode.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Ai", "Fixtures", "learn-2026-10-30.json")))!.AsObject();

    private const string CSharp12 = "https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12";
    private const string FunctionsOverview = "https://learn.microsoft.com/azure/azure-functions/functions-overview";

    /// <summary>Answers as the server does: one server-sent event carrying the JSON-RPC reply.</summary>
    private sealed class Replay : HttpMessageHandler
    {
        public List<string> Calls { get; } = new();
        public bool Offline { get; init; }
        public int FailFirst { get; set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (Offline) throw new HttpRequestException("offline");
            var call = JsonNode.Parse(await request.Content!.ReadAsStringAsync(ct))!["params"]!;
            var tool = call["name"]!.GetValue<string>();
            var key = tool == "microsoft_docs_search"
                ? $"search|{call["arguments"]!["query"]!.GetValue<string>()}"
                : $"fetch|{call["arguments"]!["url"]!.GetValue<string>()}";
            Calls.Add(key);
            if (FailFirst > 0) { FailFirst--; return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable); }

            var result = Recorded.TryGetPropertyValue(key, out var recorded) && recorded is not null
                ? recorded.DeepClone()
                : new JsonObject
                {
                    ["content"] = new JsonArray(new JsonObject
                    {
                        ["type"] = "text",
                        ["text"] = "The provided URL points to a page that could not be retrieved (possibly a 404 or network error).",
                    }),
                };
            var reply = new JsonObject { ["jsonrpc"] = "2.0", ["id"] = 1, ["result"] = result };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent($"event: message\ndata: {reply.ToJsonString()}\n\n", Encoding.UTF8, "text/event-stream"),
            };
        }
    }

    private static (MicrosoftLearnSourceProvider Provider, Replay Http) Build(Replay? replay = null, bool enabled = true)
    {
        var http = replay ?? new Replay();
        var options = new SourceOptions { Enabled = true, MicrosoftLearn = new MicrosoftLearnOptions { Enabled = enabled } };
        return (new MicrosoftLearnSourceProvider(
            new HttpClient(http),
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(options),
            NullLogger<MicrosoftLearnSourceProvider>.Instance), http);
    }

    [Theory]
    [InlineData("English", true, true)]
    [InlineData("english", true, true)]
    [InlineData("Albanian", true, false)]   // no Albanian Learn, and no translating (proposal §4d)
    [InlineData("English", false, false)]   // switched off on its own
    public void Serves_English_only_and_only_when_on(string language, bool enabled, bool expected) =>
        Assert.Equal(expected, Build(enabled: enabled).Provider.SupportsLanguage(language));

    [Fact]
    public async Task A_clear_title_match_is_used_with_its_page_as_prose()
    {
        var (provider, _) = Build();

        var lookup = await provider.LookupAsync("Azure Functions", "English", default);

        Assert.Equal(SourceOutcome.Selected, lookup.Outcome);
        Assert.Equal("What is Azure Functions?", lookup.Title);
        Assert.Equal(FunctionsOverview, lookup.Url);
        Assert.Equal(FunctionsOverview, lookup.Key);
        Assert.StartsWith("# What is Azure Functions?", lookup.Text);
        Assert.DoesNotContain("](", lookup.Text);   // links read as their text
    }

    [Fact]
    public async Task A_topic_spanning_two_pages_asks_between_them()
    {
        var (provider, _) = Build();

        var lookup = await provider.LookupAsync("New features in C# 12 and .NET 8", "English", default);

        Assert.Equal(SourceOutcome.NeedsDisambiguation, lookup.Outcome);
        Assert.False(lookup.TermIsAmbiguous);
        var first = lookup.Candidates[0];
        Assert.Equal("What's new in C# 12", first.Title);
        Assert.Equal(MicrosoftLearnSourceProvider.ProviderName, first.Provider);
        Assert.Equal(CSharp12, first.FetchKey);
        Assert.Contains(lookup.Candidates, c => c.Title == "What's new in the .NET 8 runtime");
        // "What's new in .NET 8" is the better title and is left out: it is 359 words, under the
        // minimum. The same rule as a Wikipedia stub.
        Assert.DoesNotContain(lookup.Candidates, c => c.Title == "What's new in .NET 8");
        // The page's own heading, not the search's: the search calls it "The history of C".
        Assert.DoesNotContain(lookup.Candidates, c => c.Title == "The history of C");
    }

    [Fact]
    public async Task A_page_is_matched_by_its_address_too()
    {
        // "Migrations Overview" says nothing about Entity Framework; its address does.
        var (provider, _) = Build();

        var lookup = await provider.LookupAsync("Entity Framework Core migrations", "English", default);

        Assert.Equal(SourceOutcome.NeedsDisambiguation, lookup.Outcome);
        Assert.Contains(lookup.Candidates, c => c.Title == "Migrations Overview");
    }

    [Fact]
    public async Task A_page_sharing_one_word_of_a_longer_topic_is_never_offered()
    {
        // "What's New in EF Core 9" shares only "Core" with the topic: offered, it would be noise.
        var (provider, _) = Build();

        var lookup = await provider.LookupAsync("Entity Framework Core migrations", "English", default);

        Assert.DoesNotContain(lookup.Candidates, c => c.Title.StartsWith("What's New in EF Core"));
    }

    [Fact]
    public async Task A_topic_Learn_has_nothing_on_costs_no_fetch()
    {
        var (provider, http) = Build();

        var lookup = await provider.LookupAsync("Photosynthesis", "English", default);

        Assert.Equal(SourceOutcome.NotFound, lookup.Outcome);
        Assert.Equal(new[] { "search|Photosynthesis" }, http.Calls);
    }

    [Fact]
    public async Task Repeating_a_lookup_is_answered_from_the_cache()
    {
        var (provider, http) = Build();

        await provider.LookupAsync("Azure Functions", "English", default);
        var calls = http.Calls.Count;
        await provider.LookupAsync("Azure Functions", "English", default);

        Assert.Equal(calls, http.Calls.Count);
    }

    [Fact]
    public async Task Unreachable_is_unavailable_never_not_found()
    {
        var (provider, _) = Build(new Replay { Offline = true });

        var lookup = await provider.LookupAsync("Azure Functions", "English", default);

        Assert.Equal(SourceOutcome.Unavailable, lookup.Outcome);
    }

    [Fact]
    public async Task One_failure_is_retried()
    {
        var (provider, _) = Build(new Replay { FailFirst = 1 });

        var lookup = await provider.LookupAsync("Azure Functions", "English", default);

        Assert.Equal(SourceOutcome.Selected, lookup.Outcome);
    }

    [Fact]
    public async Task A_picked_page_is_fetched_by_its_url()
    {
        var (provider, _) = Build();

        var lookup = await provider.FetchAsync(CSharp12 + "#primary-constructors", "English", default);

        Assert.Equal(SourceOutcome.Selected, lookup.Outcome);
        Assert.Equal("What's new in C# 12", lookup.Title);
        Assert.Equal(CSharp12, lookup.Url);
    }

    [Theory]
    [InlineData("https://example.com/page")]
    [InlineData("https://learn.microsoft.com/answers/a/2021724")]
    [InlineData("http://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12")]
    [InlineData("What's new in C# 12")]
    public async Task Anything_but_a_Learn_documentation_page_is_never_fetched(string key)
    {
        var (provider, http) = Build();

        var lookup = await provider.FetchAsync(key, "English", default);

        Assert.Equal(SourceOutcome.NotFound, lookup.Outcome);
        Assert.Empty(http.Calls);
    }

    [Fact]
    public async Task A_page_that_has_gone_is_not_found()
    {
        var (provider, _) = Build();

        var lookup = await provider.FetchAsync("https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-99", "English", default);

        Assert.Equal(SourceOutcome.NotFound, lookup.Outcome);
    }

    [Fact]
    public async Task Never_settles_a_topics_language() =>
        Assert.False(await Build().Provider.HasTitleAsync("Azure Functions", "English", default));

    // ── Text ─────────────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12#primary-constructors",
                "https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12")]
    [InlineData("https://learn.microsoft.com/sql/relational-databases/indexes/indexes?view=sql-server-ver17",
                "https://learn.microsoft.com/sql/relational-databases/indexes/indexes?view=sql-server-ver17")]
    [InlineData("https://learn.microsoft.com/dotnet/api/system.string", null)]
    [InlineData("https://learn.microsoft.com/training/modules/introduction-to-powershell/", null)]
    [InlineData("https://raw.githubusercontent.com/x/y/main/README.md", null)]
    [InlineData("https://learn.microsoft.com/", null)]
    public void Only_documentation_pages_on_Learn_pass(string url, string? expected) =>
        Assert.Equal(expected, MicrosoftLearnSourceProvider.Normalise(url));

    [Theory]
    [InlineData("https://learn.microsoft.com/ef/core/managing-schemas/migrations/", "ef core managing schemas migrations")]
    [InlineData("https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview", "azure azure functions functions overview")]
    public void An_address_reads_as_words(string url, string expected) =>
        Assert.Equal(expected, MicrosoftLearnSourceProvider.PathWords(url));

    [Fact]
    public void Search_titles_lose_their_tab_names() =>
        Assert.Equal("Get started with Azure Functions",
            MicrosoftLearnSourceProvider.CleanTitle("Get started with Azure Functions (programming-language-csharp)"));

    [Fact]
    public void Markdown_reads_as_prose_but_keeps_its_code()
    {
        var text = MicrosoftLearnSourceProvider.CleanMarkdown(
            "# Title\n\n> [!NOTE]\n> See [the overview](overview.md).\n\n![diagram](a.png)\n\n:::zone pivot=\"x\"\n\n\n\n```csharp\nvar x = 1;\n```\n:::zone-end\n");

        Assert.Equal("# Title\n\n> See the overview.\n\n```csharp\nvar x = 1;\n```", text);
    }

    [Theory]
    [InlineData("event: message\ndata: {\"result\":{\"a\":1}}\n\n")]
    [InlineData("{\"result\":{\"a\":1}}")]
    public void A_reply_is_read_as_an_event_or_as_json(string raw) =>
        Assert.Equal(1, MicrosoftLearnSourceProvider.ReadReply(raw)!["result"]!["a"]!.GetValue<int>());
}
