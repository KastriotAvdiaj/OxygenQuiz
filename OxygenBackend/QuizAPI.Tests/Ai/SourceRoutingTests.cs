using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// How several sources' answers for one topic become one (<see cref="SourceRouting"/>). The titles
/// are the real ones each source returned for these topics on 2026-10-29/30.
/// </summary>
public class SourceRoutingTests
{
    private const string Wiki = "wikipedia";
    private const string Learn = MicrosoftLearnSourceProvider.ProviderName;

    private static SourceAnswer Picked(string provider, string title, string? key = null) =>
        new(provider, SourceLookup.Selected(title, $"https://example.org/{title}", "text", 3000, key));

    private static SourceAnswer Asked(string provider, bool ambiguous, params string[] titles) =>
        new(provider, SourceLookup.NeedsDisambiguation(
            titles.Select(t => new SourceCandidate(t, 2000) { Provider = provider }).ToList(), ambiguous));

    private static SourceAnswer Plain(string provider, SourceLookup lookup) => new(provider, lookup);

    private static RoutedLookup Route(string topic, params SourceAnswer[] answers) =>
        SourceRouting.Combine(topic, answers, maxCandidatesToOffer: 5);

    [Fact]
    public void The_one_source_that_is_sure_is_used()
    {
        var routed = Route("Azure Functions",
            Plain(Wiki, SourceLookup.NotFound),
            Picked(Learn, "What is Azure Functions?", key: "https://learn.microsoft.com/azure/azure-functions/functions-overview"));

        Assert.Equal(SourceOutcome.Selected, routed.Lookup.Outcome);
        Assert.Equal(Learn, routed.Provider);
        Assert.Equal("What is Azure Functions?", routed.Lookup.Title);
    }

    [Fact]
    public void A_sure_source_outweighs_one_that_merely_was_not()
    {
        var routed = Route("Photosynthesis",
            Picked(Wiki, "Photosynthesis"),
            Asked(Learn, ambiguous: false, "Photosynthesis in Azure Quantum"));

        Assert.Equal(SourceOutcome.Selected, routed.Lookup.Outcome);
        Assert.Equal(Wiki, routed.Provider);
    }

    [Fact]
    public void A_disambiguation_page_asks_even_when_another_source_was_sure()
    {
        // "Azure" is the colour as much as the cloud. Learn being sure of one meaning doesn't
        // make the other go away; the sure page is offered first, among the rest.
        var routed = Route("Azure",
            Asked(Wiki, ambiguous: true, "Azure (color)", "Microsoft Azure"),
            Picked(Learn, "What is Azure?", key: "https://learn.microsoft.com/azure/what-is-azure"));

        Assert.Equal(SourceOutcome.NeedsDisambiguation, routed.Lookup.Outcome);
        Assert.Equal(new[] { "What is Azure?", "Azure (color)", "Microsoft Azure" }, routed.Lookup.Candidates.Select(c => c.Title));
        var learn = routed.Lookup.Candidates[0];
        Assert.Equal(Learn, learn.Provider);
        Assert.Equal("https://learn.microsoft.com/azure/what-is-azure", learn.FetchKey);
    }

    [Fact]
    public void Two_sure_sources_are_settled_by_the_better_title()
    {
        var routed = Route("Entity Framework Core",
            Picked(Wiki, "Entity Framework"),
            Picked(Learn, "Overview of Entity Framework Core", key: "https://learn.microsoft.com/ef/core/"));

        Assert.Equal(Learn, routed.Provider);
    }

    [Fact]
    public void Two_sure_sources_with_equally_good_titles_ask()
    {
        var routed = Route("PowerShell",
            Picked(Wiki, "PowerShell"),
            Picked(Learn, "What is PowerShell?", key: "https://learn.microsoft.com/powershell/scripting/overview"));

        Assert.Equal(SourceOutcome.NeedsDisambiguation, routed.Lookup.Outcome);
        Assert.Equal(new[] { Wiki, Learn }, routed.Lookup.Candidates.Select(c => c.Provider).OrderBy(p => p == Learn));
    }

    [Fact]
    public void Asks_from_both_are_offered_together_best_title_first()
    {
        var routed = Route("New features in C# 12 and .NET 8",
            Asked(Wiki, ambiguous: false, "C Sharp (programming language)", ".NET"),
            Asked(Learn, ambiguous: false, "What's new in C# 12", "What's new in .NET 8"));

        Assert.Equal(SourceOutcome.NeedsDisambiguation, routed.Lookup.Outcome);
        Assert.Equal("What's new in C# 12", routed.Lookup.Candidates[0].Title);
        Assert.Equal(Learn, routed.Lookup.Candidates[0].Provider);
        Assert.Contains(routed.Lookup.Candidates, c => c.Provider == Wiki);
    }

    [Fact]
    public void Too_thin_comes_before_unreachable_and_not_found()
    {
        var routed = Route("Historia e Kosovës",
            Plain(Wiki, SourceLookup.TooThin("Historia e Kosovës", null, 276)),
            Plain(Learn, SourceLookup.Unavailable));

        Assert.Equal(SourceOutcome.TooThin, routed.Lookup.Outcome);
        Assert.Equal(Wiki, routed.Provider);
    }

    [Fact]
    public void Nothing_found_with_a_source_down_is_unavailable_and_names_it()
    {
        var routed = Route("Azure Functions",
            Plain(Wiki, SourceLookup.NotFound),
            Plain(Learn, SourceLookup.Unavailable));

        Assert.Equal(SourceOutcome.Unavailable, routed.Lookup.Outcome);
        Assert.Equal(new[] { Learn }, routed.Unreachable);
    }

    [Fact]
    public void A_source_down_does_not_stop_another_that_was_sure()
    {
        var routed = Route("Photosynthesis", Picked(Wiki, "Photosynthesis"), Plain(Learn, SourceLookup.Unavailable));

        Assert.Equal(SourceOutcome.Selected, routed.Lookup.Outcome);
        Assert.Equal(new[] { Learn }, routed.Unreachable);
    }

    [Fact]
    public void Nothing_anywhere_is_not_found()
    {
        var routed = Route("Rregullat e futbollit", Plain(Wiki, SourceLookup.NotFound), Plain(Learn, SourceLookup.NotFound));

        Assert.Equal(SourceOutcome.NotFound, routed.Lookup.Outcome);
        Assert.Empty(routed.Unreachable);
    }
}

/// <summary>What the wizard is sent when it has to ask — the fields it answers with.</summary>
public class AiGroundingDtoTests
{
    [Fact]
    public void Each_article_carries_its_source_and_the_key_to_send_back()
    {
        var dto = QuizAPI.DTOs.Quiz.AiGroundingDTO.From(new GroundingResult
        {
            Status = GroundingStatus.NeedsArticle,
            Language = "English",
            Candidates = new[]
            {
                new SourceCandidate("What's new in C# 12", 1410)
                {
                    Provider = MicrosoftLearnSourceProvider.ProviderName,
                    Key = "https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12",
                },
                new SourceCandidate("C Sharp (programming language)", 9000),
            },
        })!;

        Assert.Equal(new[] { "microsoft-learn", "wikipedia" }, dto.Articles!.Select(a => a.Provider));
        Assert.Equal("https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12", dto.Articles![0].Key);
        Assert.Equal("C Sharp (programming language)", dto.Articles[1].Key);   // Wikipedia: the title
        Assert.Null(dto.Unreachable);
    }

    [Fact]
    public void An_outage_says_which_source()
    {
        var dto = QuizAPI.DTOs.Quiz.AiGroundingDTO.From(new GroundingResult
        {
            Status = GroundingStatus.SourceUnavailable,
            Reason = "unavailable",
            Unreachable = new[] { "wikipedia" },
        })!;

        Assert.Equal(new[] { "wikipedia" }, dto.Unreachable);
    }
}
