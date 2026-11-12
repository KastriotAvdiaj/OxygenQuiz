using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Ai.Sources;
using QuizAPI.Services.CurrentUserService;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The call that tells a broad topic from one subject (docs/quiz/ai-quiz-generation-flow.md §2f).
/// What matters here is what it does around the model: it reads the reply strictly, never fails a
/// generation, leaves a ledger row for the money it spent, and doesn't spend twice on one topic.
/// </summary>
public class TopicPlannerTests
{
    private const string Broad =
        """{"kind":"broad","subtopics":["Solar System","French Revolution","Amazon River"]}""";

    private sealed record Harness(
        TopicPlanner Planner, Mock<IQuizAiProvider> Model, List<AiGenerationUsage> Rows, List<string> Prompts);

    private static Harness Build(
        string reply = Broad,
        bool signedIn = true,
        int? remaining = 2,
        bool overBudget = false,
        bool aiEnabled = true,
        bool broadEnabled = true,
        string? effort = "none",
        Exception? throws = null)
    {
        var prompts = new List<string>();
        var model = new Mock<IQuizAiProvider>();
        model.SetupGet(m => m.Model).Returns("test-model");
        var withEffort = model.Setup(m => m.CompleteJsonAsync(
            It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<AiCallOptions>(), It.IsAny<CancellationToken>()));
        var plain = model.Setup(m => m.CompleteJsonAsync(
            It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()));
        if (throws is not null)
        {
            withEffort.ThrowsAsync(throws);
            plain.ThrowsAsync(throws);
        }
        else
        {
            withEffort.Callback((string p, int? _, AiCallOptions _, CancellationToken _) => prompts.Add(p))
                      .ReturnsAsync(new AiProviderResult(reply, new AiTokenUsage(400, 60)));
            plain.Callback((string p, int? _, CancellationToken _) => prompts.Add(p))
                 .ReturnsAsync(new AiProviderResult(reply, new AiTokenUsage(400, 60)));
        }

        var rows = new List<AiGenerationUsage>();
        var usages = new Mock<IAiGenerationUsageRepository>();
        usages.Setup(u => u.AddAsync(It.IsAny<AiGenerationUsage>(), It.IsAny<CancellationToken>()))
              .Callback((AiGenerationUsage row, CancellationToken _) => rows.Add(row))
              .Returns(Task.CompletedTask);

        var quota = new Mock<IAiQuotaService>();
        quota.Setup(q => q.GetStatusAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new AiQuotaStatus(remaining is null ? null : 2, 0, remaining, DateTime.UtcNow));
        quota.Setup(q => q.IsOverBudgetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(overBudget);

        var user = new Mock<ICurrentUserService>();
        user.SetupGet(u => u.UserId).Returns(signedIn ? Guid.NewGuid() : null);

        var source = new SourceOptions { Enabled = true };
        source.Broad.Enabled = broadEnabled;
        source.Broad.PlanReasoningEffort = effort;

        var planner = new TopicPlanner(
            model.Object, usages.Object, quota.Object, user.Object,
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new AiOptions
            {
                Enabled = aiEnabled, InputCostPerMillionUsd = 0.15m, OutputCostPerMillionUsd = 0.60m,
            }),
            Options.Create(source),
            NullLogger<TopicPlanner>.Instance);

        return new Harness(planner, model, rows, prompts);
    }

    [Fact]
    public async Task A_broad_reply_becomes_a_plan_with_its_subtopics()
    {
        var h = Build();

        var plan = await h.Planner.PlanAsync("General Knowledge", "English", default);

        Assert.Equal(TopicKind.Broad, plan!.Kind);
        Assert.Equal(["Solar System", "French Revolution", "Amazon River"], plan.Subtopics);
    }

    [Fact]
    public async Task The_prompt_names_the_topic_the_language_and_says_json()
    {
        var h = Build();

        await h.Planner.PlanAsync("History's most significant events", "Albanian", default);

        var prompt = Assert.Single(h.Prompts);
        Assert.Contains("History's most significant events", prompt);
        Assert.Contains("Albanian Wikipedia", prompt);
        // JSON mode refuses a prompt without the word (OpenAiCompatibleQuizAiProvider asserts it).
        Assert.Contains("json", prompt);
        Assert.StartsWith(TopicPlanner.Marker, prompt);
    }

    [Fact]
    public async Task The_call_carries_its_own_reasoning_effort_and_a_small_ceiling()
    {
        var h = Build();

        await h.Planner.PlanAsync("General Knowledge", "English", default);

        h.Model.Verify(m => m.CompleteJsonAsync(
            It.IsAny<string>(), 400, It.Is<AiCallOptions>(c => c.ReasoningEffort == "none" && c.Image == null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task With_no_effort_configured_the_vendors_own_is_kept()
    {
        var h = Build(effort: " ");

        await h.Planner.PlanAsync("General Knowledge", "English", default);

        h.Model.Verify(m => m.CompleteJsonAsync(It.IsAny<string>(), 400, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Every_call_leaves_a_ledger_row_that_takes_no_quiz_slot()
    {
        var h = Build();

        await h.Planner.PlanAsync("General Knowledge", "English", default);

        var row = Assert.Single(h.Rows);
        // The slot count reads Topic and Source rows only, so this mode is what keeps it free.
        Assert.Equal(AiGenerationMode.TopicPlan, row.Mode);
        Assert.Equal(AiGenerationStatus.Succeeded, row.Status);
        Assert.Equal(400, row.InputTokens);
        Assert.Equal(60, row.OutputTokens);
        Assert.Equal(400 / 1_000_000m * 0.15m + 60 / 1_000_000m * 0.60m, row.EstimatedCostUsd);
    }

    [Fact]
    public async Task The_same_topic_is_planned_once()
    {
        var h = Build();

        await h.Planner.PlanAsync("General Knowledge", "English", default);
        var again = await h.Planner.PlanAsync("  general knowledge ", "English", default);

        Assert.Equal(TopicKind.Broad, again!.Kind);
        Assert.Single(h.Prompts);
        Assert.Single(h.Rows);
    }

    [Fact]
    public async Task The_same_words_in_another_language_are_planned_again()
    {
        var h = Build();

        await h.Planner.PlanAsync("Sport", "English", default);
        await h.Planner.PlanAsync("Sport", "Albanian", default);

        Assert.Equal(2, h.Prompts.Count);
    }

    [Fact]
    public async Task An_unusable_reply_is_no_plan_is_not_cached_and_is_still_paid_for()
    {
        var h = Build(reply: "Sure! Here are some ideas…");

        Assert.Null(await h.Planner.PlanAsync("General Knowledge", "English", default));
        Assert.Null(await h.Planner.PlanAsync("General Knowledge", "English", default));

        Assert.Equal(2, h.Prompts.Count);
        Assert.All(h.Rows, r =>
        {
            Assert.Equal(AiGenerationStatus.Released, r.Status);
            Assert.Equal(AiErrorCodes.ModelOutputInvalid, r.ErrorCode);
        });
    }

    [Fact]
    public async Task A_provider_failure_is_no_plan_never_an_error()
    {
        var h = Build(throws: new AiProviderException(AiErrorCodes.ProviderTimeout, "slow"));

        Assert.Null(await h.Planner.PlanAsync("General Knowledge", "English", default));
        Assert.Empty(h.Rows);
    }

    [Theory]
    [InlineData(false, 2, false, true, true)]   // nobody signed in: no owner for the row
    [InlineData(true, 0, false, true, true)]    // no generation left today: a plan would be unusable
    [InlineData(true, 2, true, true, true)]     // the spending cap is reached
    [InlineData(true, 2, false, false, true)]   // AI is switched off
    [InlineData(true, 2, false, true, false)]   // broad topics are switched off
    public async Task Nothing_is_spent_when_a_plan_could_not_be_used(
        bool signedIn, int remaining, bool overBudget, bool aiEnabled, bool broadEnabled)
    {
        var h = Build(signedIn: signedIn, remaining: remaining, overBudget: overBudget,
            aiEnabled: aiEnabled, broadEnabled: broadEnabled);

        Assert.Null(await h.Planner.PlanAsync("General Knowledge", "English", default));

        Assert.Empty(h.Prompts);
        Assert.Empty(h.Rows);
    }

    [Fact]
    public async Task Staff_with_no_daily_limit_are_planned_for()
    {
        var h = Build(remaining: null);

        Assert.NotNull(await h.Planner.PlanAsync("General Knowledge", "English", default));
    }

    // ── Reading the reply ────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("""{"kind":"single","subtopics":[]}""")]
    [InlineData("""{"kind":"Single"}""")]
    // "single" wins over whatever came with it.
    [InlineData("""{"kind":"single","subtopics":["Photosynthesis"]}""")]
    public void Single_is_single(string reply) =>
        Assert.Equal(TopicKind.Single, TopicPlanner.Parse(reply, 10)!.Kind);

    [Fact]
    public void A_fenced_or_chatty_reply_still_holds_its_object()
    {
        var plan = TopicPlanner.Parse("Here you go:\n```json\n" + Broad + "\n```", 10);

        Assert.Equal(3, plan!.Subtopics.Count);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json at all")]
    [InlineData("""{"kind":"wide","subtopics":["A","B"]}""")]
    [InlineData("""{"subtopics":["A","B"]}""")]
    [InlineData("""{"kind":"broad"}""")]
    [InlineData("""{"kind":"broad","subtopics":"Solar System"}""")]
    // One article is what "single" already does, so a one-name "broad" is not a plan.
    [InlineData("""{"kind":"broad","subtopics":["Solar System"]}""")]
    [InlineData("""{"kind":"broad","subtopics":[1,2,3]}""")]
    [InlineData("""["Solar System","French Revolution"]""")]
    public void Anything_else_is_no_plan(string? reply) => Assert.Null(TopicPlanner.Parse(reply, 10));

    [Fact]
    public void Subtopics_are_trimmed_deduplicated_capped_and_must_look_like_titles()
    {
        var sentence = new string('x', TopicPlanner.MaxSubtopicLength + 1);
        var reply = $$"""
            {"kind":"broad","subtopics":[" Solar System ","solar system","",42,"{{sentence}}","Amazon River","Mount Everest","Olympic Games"]}
            """;

        var plan = TopicPlanner.Parse(reply, max: 3);

        Assert.Equal(["Solar System", "Amazon River", "Mount Everest"], plan!.Subtopics);
    }
}
