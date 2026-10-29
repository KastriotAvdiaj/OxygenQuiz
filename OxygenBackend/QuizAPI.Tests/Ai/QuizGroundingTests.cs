using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The order of decisions in front of a grounded generation: language, then article, then what to
/// tell the author. The provider is faked — <c>WikipediaSourceProviderTests</c> covers the real
/// one against recorded responses — so these are about the decisions, not the wire.
/// </summary>
public class QuizGroundingTests
{
    private const string Article = "Photosynthesis is the process by which plants turn light into chemical energy.";

    private static Mock<IQuizSourceProvider> Provider(
        SourceLookup? lookup = null,
        IEnumerable<string>? titlesIn = null)
    {
        var provider = new Mock<IQuizSourceProvider>();
        provider.SetupGet(p => p.Name).Returns("wikipedia");
        provider.Setup(p => p.SupportsLanguage(It.IsAny<string?>()))
                .Returns((string? l) => l is "English" or "Albanian");
        provider.Setup(p => p.LookupAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(lookup ?? SourceLookup.Selected("Photosynthesis", "https://en.wikipedia.org/wiki/Photosynthesis", Article, 11914));
        provider.Setup(p => p.FetchAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((string title, string? _, CancellationToken _) => SourceLookup.Selected(title, null, Article, 5000));
        var editions = (titlesIn ?? Array.Empty<string>()).ToHashSet();
        provider.Setup(p => p.HasTitleAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((string _, string? language, CancellationToken _) => language is not null && editions.Contains(language));
        return provider;
    }

    private static QuizGrounding Grounding(Mock<IQuizSourceProvider> provider, bool enabled = true) =>
        new(new[] { provider.Object }, Options.Create(new SourceOptions { Enabled = enabled }));

    private static readonly GroundingAnswers NoAnswers = new(null, null);

    [Fact]
    public async Task Switched_off_is_off_and_asks_nothing_of_the_source()
    {
        var provider = Provider();

        var result = await Grounding(provider, enabled: false).GroundAsync("Photosynthesis", NoAnswers, default);

        Assert.Equal(GroundingStatus.Off, result.Status);
        provider.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task A_clear_topic_is_grounded_in_its_own_language()
    {
        var provider = Provider();

        var result = await Grounding(provider).GroundAsync("Rregullat e futbollit", NoAnswers, default);

        Assert.Equal(GroundingStatus.Grounded, result.Status);
        Assert.Equal("Albanian", result.Language);
        Assert.Equal(Article, result.Source!.Text);
        provider.Verify(p => p.LookupAsync("Rregullat e futbollit", "Albanian", It.IsAny<CancellationToken>()));
        // The topic's words decided it, so no title check was spent.
        provider.Verify(p => p.HasTitleAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Language when the words say nothing ──────────────────────────────────────────────────

    [Fact]
    public async Task A_title_in_one_edition_only_settles_the_language()
    {
        var provider = Provider(titlesIn: new[] { "Albanian" });

        var result = await Grounding(provider).GroundAsync("Futbolli", NoAnswers, default);

        Assert.Equal("Albanian", result.Language);
        Assert.Equal(GroundingStatus.Grounded, result.Status);
    }

    [Theory]
    [InlineData(true)]   // "Python": the language on English Wikipedia, the snake on Albanian
    [InlineData(false)]  // a title neither edition has
    public async Task Both_editions_or_neither_means_asking(bool inBoth)
    {
        var provider = Provider(titlesIn: inBoth ? new[] { "English", "Albanian" } : Array.Empty<string>());

        var result = await Grounding(provider).GroundAsync("Python", NoAnswers, default);

        Assert.Equal(GroundingStatus.NeedsLanguage, result.Status);
        Assert.Equal(new[] { "English", "Albanian" }, result.Languages);
        provider.Verify(p => p.LookupAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task The_authors_answer_beats_every_guess()
    {
        var provider = Provider(titlesIn: new[] { "English", "Albanian" });

        var result = await Grounding(provider).GroundAsync("Python", new GroundingAnswers("albanian", null), default);

        Assert.Equal("Albanian", result.Language);
        provider.Verify(p => p.HasTitleAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task A_named_language_with_no_source_is_ungrounded_not_translated()
    {
        var provider = Provider();

        var result = await Grounding(provider).GroundAsync("Photosynthese", new GroundingAnswers("German", null), default);

        Assert.Equal(GroundingStatus.Ungrounded, result.Status);
        Assert.Equal("no-source-for-language", result.Reason);
        provider.Verify(p => p.LookupAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Article ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task An_unsure_search_asks_which_article()
    {
        var candidates = new[] { new SourceCandidate("Mercury (planet)", 16170), new SourceCandidate("Freddie Mercury", 17329) };
        var provider = Provider(SourceLookup.NeedsDisambiguation(candidates), titlesIn: new[] { "English" });

        var result = await Grounding(provider).GroundAsync("Mercury", NoAnswers, default);

        Assert.Equal(GroundingStatus.NeedsArticle, result.Status);
        Assert.Equal("English", result.Language);
        Assert.Equal(candidates, result.Candidates);
    }

    [Fact]
    public async Task A_picked_article_is_fetched_not_searched_again()
    {
        var provider = Provider(titlesIn: new[] { "English" });

        var result = await Grounding(provider).GroundAsync("Mercury", new GroundingAnswers("English", "Mercury (planet)"), default);

        Assert.Equal(GroundingStatus.Grounded, result.Status);
        Assert.Equal("Mercury (planet)", result.Source!.Title);
        provider.Verify(p => p.LookupAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task None_of_these_writes_from_memory_without_another_lookup()
    {
        var provider = Provider(titlesIn: new[] { "English" });

        var result = await Grounding(provider).GroundAsync("Mercury", new GroundingAnswers(null, null, Declined: true), default);

        Assert.Equal(GroundingStatus.Ungrounded, result.Status);
        Assert.Equal("declined", result.Reason);
        Assert.Equal("English", result.Language);
        provider.Verify(p => p.LookupAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task No_article_falls_back_to_ungrounded_with_a_reason()
    {
        var provider = Provider(SourceLookup.NotFound);

        var result = await Grounding(provider).GroundAsync("The human respiratory system", NoAnswers, default);

        Assert.Equal(GroundingStatus.Ungrounded, result.Status);
        Assert.Equal("not-found", result.Reason);
        Assert.Equal("English", result.Language); // still pinned, so the fallback writes in the searched language
    }

    [Fact]
    public async Task A_source_that_is_down_is_a_question_not_a_silent_fallback()
    {
        // From memory the same topics were 15% wrong against 4% grounded (2026-10-29), so the
        // author decides: wait, or go ahead knowing that.
        var provider = Provider(SourceLookup.Unavailable);

        var result = await Grounding(provider).GroundAsync("The human respiratory system", NoAnswers, default);

        Assert.Equal(GroundingStatus.SourceUnavailable, result.Status);
        Assert.True(result.NeedsChoice);
        Assert.Equal("English", result.Language);
    }

    [Fact]
    public async Task Accepting_memory_after_an_outage_writes_ungrounded_and_says_why()
    {
        var provider = Provider(SourceLookup.Unavailable);

        var result = await Grounding(provider).GroundAsync(
            "The human respiratory system", new GroundingAnswers(null, null, AcceptFromMemory: true), default);

        Assert.Equal(GroundingStatus.Ungrounded, result.Status);
        Assert.Equal("unavailable", result.Reason);
    }

    [Fact]
    public async Task A_stub_is_ungrounded_and_names_what_was_rejected()
    {
        var provider = Provider(SourceLookup.TooThin("Historia e Kosovës", null, 276));

        var result = await Grounding(provider).GroundAsync("Historia e Kosovës", NoAnswers, default);

        Assert.Equal(GroundingStatus.Ungrounded, result.Status);
        Assert.Equal("too-thin", result.Reason);
        Assert.Equal("Historia e Kosovës", result.ConsideredTitle);
    }
}
