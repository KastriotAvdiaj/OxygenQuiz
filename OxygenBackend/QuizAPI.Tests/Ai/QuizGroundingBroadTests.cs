using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// A topic that spans many subjects (docs/quiz/ai-quiz-generation-flow.md §2f): the planner's
/// subtopics are each looked up, the clear matches are read together, and nobody is asked "which
/// article?". Planner and source are faked — these are about what grounding does with them.
/// </summary>
public class QuizGroundingBroadTests
{
    private static readonly GroundingAnswers NoAnswers = new(null, null);

    private static readonly string[] Ten =
    [
        "Solar System", "French Revolution", "Photosynthesis", "Amazon River", "Leonardo da Vinci",
        "Human heart", "Olympic Games", "Printing press", "Mount Everest", "Periodic table",
    ];

    private static string Body(string title) =>
        $"{title} is a subject with a long and established article. It has several well-known facts.";

    /// <param name="answer">What the source says for a subtopic; the default is a clear match.</param>
    private static Mock<IQuizSourceProvider> Source(Func<string, SourceLookup>? answer = null)
    {
        var provider = new Mock<IQuizSourceProvider>();
        provider.SetupGet(p => p.Name).Returns("wikipedia");
        provider.Setup(p => p.SupportsLanguage(It.IsAny<string?>())).Returns(true);
        provider.Setup(p => p.HasTitleAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((string _, string? language, CancellationToken _) => language == "English");
        provider.Setup(p => p.LookupAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((string topic, string? _, CancellationToken _) =>
                    answer?.Invoke(topic) ?? Selected(topic));
        provider.Setup(p => p.FetchAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((string title, string? _, CancellationToken _) => Selected(title));
        return provider;
    }

    private static SourceLookup Selected(string title) =>
        SourceLookup.Selected(title, $"https://en.wikipedia.org/wiki/{title.Replace(' ', '_')}", Body(title), 5000);

    private static Mock<ITopicPlanner> Planner(TopicPlan? plan)
    {
        var planner = new Mock<ITopicPlanner>();
        planner.Setup(p => p.PlanAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(plan);
        return planner;
    }

    private static TopicPlan BroadPlan(params string[] subtopics) =>
        new(TopicKind.Broad, subtopics.Length > 0 ? subtopics : Ten);

    private static QuizGrounding Grounding(
        Mock<IQuizSourceProvider> source, Mock<ITopicPlanner>? planner, Action<SourceOptions>? configure = null)
    {
        var options = new SourceOptions { Enabled = true };
        configure?.Invoke(options);
        return new QuizGrounding(new[] { source.Object }, Options.Create(options), facts: null, planner: planner?.Object);
    }

    [Fact]
    public async Task A_broad_topic_is_grounded_in_several_articles_and_asks_nothing()
    {
        var source = Source();

        var result = await Grounding(source, Planner(BroadPlan())).GroundAsync("General Knowledge", NoAnswers, default);

        Assert.Equal(GroundingStatus.Grounded, result.Status);
        Assert.False(result.NeedsChoice);
        Assert.Equal("English", result.Language);

        var compound = result.Source!;
        Assert.True(compound.IsCompound);
        // The topic, not an article: the review names the articles from Parts.
        Assert.Equal("General Knowledge", compound.Title);
        Assert.Null(compound.Url);
        Assert.Equal(8, compound.Parts.Count);
        Assert.Equal(Ten.Take(8), compound.Parts.Select(p => p.Title));
        Assert.All(compound.Parts, p => Assert.StartsWith("https://en.wikipedia.org/wiki/", p.Url));
    }

    [Fact]
    public async Task The_topic_itself_is_never_looked_up_for_a_broad_topic()
    {
        // The whole bug: "General Knowledge" matched the article "General knowledge" exactly.
        var source = Source();

        await Grounding(source, Planner(BroadPlan())).GroundAsync("General Knowledge", NoAnswers, default);

        source.Verify(p => p.LookupAsync("General Knowledge", It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        source.Verify(p => p.LookupAsync("Solar System", "English", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task The_text_is_one_material_with_a_marker_line_per_article()
    {
        var result = await Grounding(Source(), Planner(BroadPlan("Solar System", "Amazon River", "Mount Everest")))
            .GroundAsync("General Knowledge", NoAnswers, default);

        var text = result.Source!.Text;
        Assert.StartsWith("[S1] Solar System\n", text);
        Assert.Contains("\n\n[S2] Amazon River\n", text);
        Assert.Contains("\n\n[S3] Mount Everest\n", text);
        // Every article's own sentences are in it verbatim — that is what the quote check matches.
        Assert.Contains(Body("Amazon River"), text);
    }

    [Fact]
    public async Task What_does_not_resolve_clearly_is_dropped_not_asked_about()
    {
        var source = Source(topic => topic switch
        {
            "French Revolution" => SourceLookup.NeedsDisambiguation(
                new[] { new SourceCandidate("French Revolution (1848)", 4000) }),
            "Photosynthesis" => SourceLookup.TooThin("Photosynthesis", null, 120),
            "Amazon River" => SourceLookup.NotFound,
            "Leonardo da Vinci" => SourceLookup.Unavailable,
            _ => Selected(topic),
        });

        var result = await Grounding(source, Planner(BroadPlan())).GroundAsync("General Knowledge", NoAnswers, default);

        Assert.Equal(GroundingStatus.Grounded, result.Status);
        Assert.Equal(
            ["Solar System", "Human heart", "Olympic Games", "Printing press", "Mount Everest", "Periodic table"],
            result.Source!.Parts.Select(p => p.Title));
    }

    [Fact]
    public async Task Two_subtopics_that_land_on_one_article_count_once()
    {
        var source = Source(topic => topic is "WWII" or "Second World War" ? Selected("World War II") : Selected(topic));

        var result = await Grounding(source, Planner(BroadPlan("WWII", "Second World War", "Amazon River", "Mount Everest")))
            .GroundAsync("History's most significant events", NoAnswers, default);

        Assert.Equal(["World War II", "Amazon River", "Mount Everest"], result.Source!.Parts.Select(p => p.Title));
    }

    [Fact]
    public async Task Too_few_articles_is_written_from_memory_and_says_so()
    {
        var source = Source(topic => topic is "Solar System" or "Human heart" ? Selected(topic) : SourceLookup.NotFound);

        var result = await Grounding(source, Planner(BroadPlan())).GroundAsync("General Knowledge", NoAnswers, default);

        // Two articles under "General knowledge" would be a quiz about those two things.
        Assert.Equal(GroundingStatus.Ungrounded, result.Status);
        Assert.Equal("too-few-articles", result.Reason);
        Assert.Equal("English", result.Language);
        Assert.Null(result.Source);
    }

    [Fact]
    public async Task A_source_that_is_down_is_the_same_question_as_for_one_article()
    {
        var source = Source(_ => SourceLookup.Unavailable);
        var grounding = Grounding(source, Planner(BroadPlan()));

        var asked = await grounding.GroundAsync("General Knowledge", NoAnswers, default);
        var accepted = await grounding.GroundAsync(
            "General Knowledge", new GroundingAnswers(null, null, AcceptFromMemory: true), default);

        Assert.Equal(GroundingStatus.SourceUnavailable, asked.Status);
        Assert.Equal(["wikipedia"], asked.Unreachable);
        Assert.Equal(GroundingStatus.Ungrounded, accepted.Status);
        Assert.Equal("unavailable", accepted.Reason);
    }

    [Fact]
    public async Task Each_article_is_cut_to_its_share_at_a_paragraph()
    {
        var first = new string('a', 900) + ".";
        var second = new string('b', 900) + ".";
        var third = new string('c', 900) + ".";
        var source = Source(topic => SourceLookup.Selected(topic, null, $"{first}\n\n{second}\n\n{third}", 5000));

        var result = await Grounding(source, Planner(BroadPlan("One", "Two", "Three")), o => o.Broad.MaxCharsPerSource = 2000)
            .GroundAsync("General Knowledge", NoAnswers, default);

        var text = result.Source!.Text;
        Assert.Contains(second, text);
        Assert.DoesNotContain("c", text.Replace("[S", string.Empty));
    }

    // ── When nothing is planned ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_single_subject_is_grounded_exactly_as_before()
    {
        var source = Source();

        var result = await Grounding(source, Planner(TopicPlan.Single)).GroundAsync("Photosynthesis", NoAnswers, default);

        Assert.Equal(GroundingStatus.Grounded, result.Status);
        Assert.False(result.Source!.IsCompound);
        Assert.Equal("Photosynthesis", result.Source.Title);
        source.Verify(p => p.LookupAsync("Photosynthesis", "English", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task No_plan_means_one_subject()
    {
        var result = await Grounding(Source(), Planner(null)).GroundAsync("General Knowledge", NoAnswers, default);

        Assert.False(result.Source!.IsCompound);
    }

    [Fact]
    public async Task A_picked_article_is_past_planning()
    {
        var planner = Planner(BroadPlan());

        var result = await Grounding(Source(), planner).GroundAsync(
            "Mercury", new GroundingAnswers("English", "Mercury (planet)"), default);

        Assert.Equal("Mercury (planet)", result.Source!.Title);
        planner.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task None_of_these_is_past_planning_too()
    {
        var planner = Planner(BroadPlan());

        var result = await Grounding(Source(), planner).GroundAsync(
            "Mercury", new GroundingAnswers("English", null, Declined: true), default);

        Assert.Equal("declined", result.Reason);
        planner.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Switched_off_nothing_is_planned()
    {
        var planner = Planner(BroadPlan());

        var result = await Grounding(Source(), planner, o => o.Broad.Enabled = false)
            .GroundAsync("General Knowledge", NoAnswers, default);

        Assert.False(result.Source!.IsCompound);
        planner.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task The_language_is_settled_before_anything_is_planned()
    {
        // No edition has the title and the words say nothing: the author is asked, and no model
        // call is spent on a topic whose language isn't known yet.
        var source = Source();
        source.Setup(p => p.HasTitleAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);
        var planner = Planner(BroadPlan());

        var result = await Grounding(source, planner).GroundAsync("Sport", NoAnswers, default);

        Assert.Equal(GroundingStatus.NeedsLanguage, result.Status);
        planner.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task The_plan_is_asked_for_in_the_quizs_language()
    {
        var planner = Planner(BroadPlan());

        await Grounding(Source(), planner).GroundAsync(
            "Njohuri të përgjithshme", new GroundingAnswers("Albanian", null), default);

        planner.Verify(p => p.PlanAsync("Njohuri të përgjithshme", "Albanian", It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Opening ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public void A_short_article_is_kept_whole() =>
        Assert.Equal("Short. Article.", QuizGrounding.Opening("  Short. Article.  ", 2500));

    [Fact]
    public void One_long_paragraph_is_cut_at_a_sentence_never_mid_sentence()
    {
        var text = "First sentence here. Second sentence here. Third sentence that runs past the limit.";

        Assert.Equal("First sentence here. Second sentence here.", QuizGrounding.Opening(text, 50));
    }
}
