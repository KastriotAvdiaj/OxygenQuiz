using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// How grounding sits in a generation: before the quota reservation, so a question put to the
/// author costs nothing; and in the prompt, so the model reads the article and quotes it. The
/// grounding step itself is faked here — <see cref="QuizGroundingTests"/> covers its decisions.
/// </summary>
public class AiGenerationServiceGroundingTests
{
    private const string Article =
        "Fotosinteza është procesi me të cilin bimët e gjelbra përdorin dritën e diellit për të prodhuar sheqer.";

    private static AiGenerationRequest TopicRequest(string? sourceTitle = null) => new()
    {
        Mode = AiGenerationMode.Topic,
        Topic = "Fotosinteza",
        LanguageNames = ["English", "Albanian", "German"],
        DifficultyNames = ["Easy", "Medium", "Hard"],
        QuestionCount = 5,
        AllowedTypes = ["MultipleChoice"],
        SourceTitle = sourceTitle,
    };

    private static GroundingResult Grounded() => new()
    {
        Status = GroundingStatus.Grounded,
        Language = "Albanian",
        Source = new GroundedSource("wikipedia", "Fotosinteza", "https://sq.wikipedia.org/wiki/Fotosinteza", Article, "Albanian"),
    };

    private sealed record Harness(
        AiGenerationService Service,
        Mock<IAiQuotaService> Quota,
        Mock<IQuizAiProvider> Model,
        Mock<IQuizGrounding> Grounding,
        List<string> Prompts);

    private static Harness Build(GroundingResult grounding, bool withGrounding = true)
    {
        var quota = new Mock<IAiQuotaService>();
        quota.Setup(q => q.IsOverBudgetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(false);
        quota.Setup(q => q.TryReserveAsync(It.IsAny<Guid>(), It.IsAny<AiGenerationRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new AiQuotaReservation(true, Guid.NewGuid(), 2, 1, DateTime.UtcNow));

        var users = new Mock<IUserRepository>();
        users.Setup(u => u.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new User { EmailConfirmed = true });

        var prompts = new List<string>();
        var model = new Mock<IQuizAiProvider>();
        model.SetupGet(m => m.Model).Returns("test-model");
        model.Setup(m => m.CompleteJsonAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
             .Callback((string p, int? _, CancellationToken _) => prompts.Add(p))
             .ReturnsAsync(new AiProviderResult("{\"questions\":[{\"type\":\"TrueFalse\"}]}", new AiTokenUsage(100, 50)));

        var groundingStep = new Mock<IQuizGrounding>();
        groundingStep.Setup(g => g.GroundAsync(It.IsAny<string>(), It.IsAny<GroundingAnswers>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(grounding);

        var service = new AiGenerationService(
            model.Object, quota.Object, users.Object, new AiPromptBuilder(),
            Options.Create(new AiOptions { Enabled = true }),
            NullLogger<AiGenerationService>.Instance,
            withGrounding ? groundingStep.Object : null);

        return new Harness(service, quota, model, groundingStep, prompts);
    }

    [Fact]
    public async Task Asking_the_author_happens_before_quota_and_before_the_model()
    {
        var h = Build(new GroundingResult { Status = GroundingStatus.NeedsLanguage, Languages = ["English", "Albanian"] });

        var outcome = await h.Service.GenerateAsync(Guid.NewGuid(), TopicRequest());

        Assert.Equal(AiErrorCodes.SourceNeedsChoice, outcome.ErrorCode);
        Assert.Equal(GroundingStatus.NeedsLanguage, outcome.Grounding.Status);
        h.Quota.Verify(q => q.TryReserveAsync(It.IsAny<Guid>(), It.IsAny<AiGenerationRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        h.Model.Verify(m => m.CompleteJsonAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task A_grounded_generation_hands_the_model_the_article_and_asks_for_quotes()
    {
        var h = Build(Grounded());

        var outcome = await h.Service.GenerateAsync(Guid.NewGuid(), TopicRequest());

        Assert.True(outcome.Success);
        Assert.Equal(GroundingStatus.Grounded, outcome.Grounding.Status);
        var prompt = Assert.Single(h.Prompts);
        Assert.Contains(Article, prompt);
        Assert.Contains("Wikipedia article \"Fotosinteza\"", prompt);
        Assert.Contains($"\"{AiPromptBuilder.SourceQuoteField}\": string", prompt);
        // The from-memory rule is gone: the model is told to read, not to recall.
        Assert.DoesNotContain("well-established, verifiable facts", prompt);
    }

    [Fact]
    public async Task Explanations_are_told_to_state_the_fact_not_cite_the_article()
    {
        // Players never see the article; "sipas materialit" explains nothing to them.
        var h = Build(Grounded());

        await h.Service.GenerateAsync(Guid.NewGuid(), TopicRequest());

        Assert.Contains("never refer to it", Assert.Single(h.Prompts));
    }

    [Fact]
    public async Task The_language_grounding_settled_on_is_the_only_one_offered()
    {
        var h = Build(Grounded());

        await h.Service.GenerateAsync(Guid.NewGuid(), TopicRequest());

        var prompt = Assert.Single(h.Prompts);
        Assert.Contains("\"language\": \"Albanian\" | null", prompt);
        Assert.DoesNotContain("\"English\"", prompt);
    }

    [Fact]
    public async Task The_authors_picks_reach_the_grounding_step()
    {
        var h = Build(Grounded());

        await h.Service.GenerateAsync(Guid.NewGuid(), TopicRequest(sourceTitle: "Fotosinteza") with { SourceLanguage = "Albanian" });

        h.Grounding.Verify(g => g.GroundAsync("Fotosinteza", new GroundingAnswers("Albanian", "Fotosinteza", false, false, null), It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task With_grounding_off_the_prompt_is_exactly_what_it_was()
    {
        var off = Build(GroundingResult.Off);
        var none = Build(GroundingResult.Off, withGrounding: false);

        await off.Service.GenerateAsync(Guid.NewGuid(), TopicRequest());
        await none.Service.GenerateAsync(Guid.NewGuid(), TopicRequest());

        Assert.Equal(Assert.Single(none.Prompts), Assert.Single(off.Prompts));
    }

    [Fact]
    public async Task A_caller_cannot_smuggle_in_an_article()
    {
        // Grounding is something the server found, never something a request asserts.
        var h = Build(GroundingResult.Off);
        var forged = TopicRequest() with { Grounding = new GroundedSource("wikipedia", "Fake", null, "INVENTED TEXT", "English") };

        await h.Service.GenerateAsync(Guid.NewGuid(), forged);

        Assert.DoesNotContain("INVENTED TEXT", Assert.Single(h.Prompts));
    }

    [Fact]
    public async Task The_copy_prompt_grounds_only_when_asked()
    {
        var h = Build(Grounded());

        var (plain, plainGrounding) = await h.Service.BuildPromptAsync(TopicRequest());
        var (grounded, groundedResult) = await h.Service.BuildPromptAsync(TopicRequest() with { Ground = true });

        Assert.DoesNotContain(Article, plain);
        Assert.Equal(GroundingStatus.Off, plainGrounding.Status);
        Assert.Contains(Article, grounded);
        Assert.Equal(GroundingStatus.Grounded, groundedResult.Status);
    }
}
