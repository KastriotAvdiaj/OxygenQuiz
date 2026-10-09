using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// AI spend is budgeted in two pools by plan, so free users exhausting the original caps can't
/// switch AI off for paying ones (docs/auth/paid-plans.md, "Two budget pools").
/// </summary>
public class AiBudgetPoolTests
{
    private static readonly Guid UserId = Guid.NewGuid();

    private static readonly AiOptions Options_ = new()
    {
        DailyBudgetUsd = 2m, MonthlyBudgetUsd = 25m,
        PaidDailyBudgetUsd = 6m, PaidMonthlyBudgetUsd = 60m,
    };

    private static AiQuotaService Build(PlanTier plan, decimal freeSpend, decimal paidSpend, out Mock<IAiGenerationUsageRepository> usages)
    {
        usages = new Mock<IAiGenerationUsageRepository>();
        usages.Setup(u => u.SumEstimatedCostSinceAsync(It.IsAny<DateTime>(), AiSpendPool.Free, It.IsAny<CancellationToken>()))
              .ReturnsAsync(freeSpend);
        usages.Setup(u => u.SumEstimatedCostSinceAsync(It.IsAny<DateTime>(), AiSpendPool.Paid, It.IsAny<CancellationToken>()))
              .ReturnsAsync(paidSpend);
        return new AiQuotaService(usages.Object, Mock.Of<IAiQuotaPolicy>(), new FixedEntitlements(plan),
            Options.Create(Options_), NullLogger<AiQuotaService>.Instance);
    }

    /// <summary>The regression the split exists for.</summary>
    [Fact]
    public async Task Free_users_spending_their_budget_does_not_switch_AI_off_for_paying_ones()
    {
        var quota = Build(PlanTier.Plus, freeSpend: 100m, paidSpend: 0m, out var usages);

        Assert.False(await quota.IsOverBudgetAsync(UserId));
        usages.Verify(u => u.SumEstimatedCostSinceAsync(It.IsAny<DateTime>(), AiSpendPool.Free, It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Free_users_are_still_held_to_the_original_caps()
    {
        var quota = Build(PlanTier.Free, freeSpend: 2m, paidSpend: 0m, out _);

        Assert.True(await quota.IsOverBudgetAsync(UserId));
    }

    [Theory]
    [InlineData(6, true)]    // daily paid ceiling
    [InlineData(5.99, false)]
    public async Task Paid_spend_has_its_own_backstop(double paidSpend, bool over)
    {
        var quota = Build(PlanTier.Teacher, freeSpend: 0m, paidSpend: (decimal)paidSpend, out _);

        Assert.Equal(over, await quota.IsOverBudgetAsync(UserId));
    }
}
