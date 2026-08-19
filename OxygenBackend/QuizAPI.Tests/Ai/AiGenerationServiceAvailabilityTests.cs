using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// <c>IsAvailableAsync</c> is what <c>GET /api/quiz/ai-quota</c> answers with, and its whole job
/// is to agree with the gates in <c>GenerateAsync</c> that return <c>FeatureDisabled</c>. When it
/// reported <c>Ai:Enabled</c> alone, a blown budget left the Generate button live and every press
/// came back a 503 the user could do nothing about (docs/quiz/ai-quiz-generation-flow.md §9.11).
///
/// The two can't share a helper — <c>GenerateAsync</c> needs the conditions separately, in order,
/// with different messages — so agreement is maintained by hand and this is what notices when it
/// stops being true. The budget case is the one worth pinning: the kill-switch case is hard to
/// break by accident, whereas the budget check is one <c>await</c> that a refactor can quietly
/// drop while everything still compiles and every other test stays green.
/// </summary>
public class AiGenerationServiceAvailabilityTests
{
    private static AiGenerationService Build(bool enabled, bool overBudget, out Mock<IAiQuotaService> quota)
    {
        quota = new Mock<IAiQuotaService>();
        quota.Setup(q => q.IsOverBudgetAsync(It.IsAny<CancellationToken>()))
             .ReturnsAsync(overBudget);

        return new AiGenerationService(
            Mock.Of<IQuizAiProvider>(),
            quota.Object,
            Mock.Of<IUserRepository>(),
            new AiPromptBuilder(),
            Options.Create(new AiOptions { Enabled = enabled }),
            NullLogger<AiGenerationService>.Instance);
    }

    [Fact]
    public async Task Available_when_switched_on_and_within_budget()
    {
        var service = Build(enabled: true, overBudget: false, out _);

        Assert.True(await service.IsAvailableAsync());
    }

    /// <summary>The regression this method exists for.</summary>
    [Fact]
    public async Task Unavailable_when_over_budget_even_though_the_switch_is_on()
    {
        var service = Build(enabled: true, overBudget: true, out _);

        Assert.False(await service.IsAvailableAsync());
    }

    /// <summary>
    /// The kill switch short-circuits, so an outage costs no aggregate query per wizard mount.
    /// Asserted rather than assumed: written the other way round (<c>!overBudget &amp;&amp;
    /// enabled</c>) it would still return the right answer everywhere, and only show up as load
    /// on the usage table at exactly the moment the feature is meant to be costing nothing.
    /// </summary>
    [Fact]
    public async Task Kill_switch_answers_without_querying_spend()
    {
        var service = Build(enabled: false, overBudget: false, out var quota);

        Assert.False(await service.IsAvailableAsync());
        quota.Verify(q => q.IsOverBudgetAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
