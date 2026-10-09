using Moq;
using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Billing;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// Count-based plan limits refuse only the one-more, and name the plan that lifts them
/// (docs/auth/paid-plans.md, "Where each limit is enforced").
/// </summary>
public class PlanLimitGuardTests
{
    private static readonly Guid UserId = Guid.NewGuid();

    private static (PlanLimitGuard Guard, Mock<IQuizRepository> Quizzes, Mock<IClassRepository> Classes) Build(
        Entitlements entitlements, int ownedQuizzes = 0, int classes = 0)
    {
        var quizzes = new Mock<IQuizRepository>();
        quizzes.Setup(q => q.CountOwnedAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(ownedQuizzes);
        var classRepo = new Mock<IClassRepository>();
        classRepo.Setup(c => c.CountAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(classes);
        return (new PlanLimitGuard(new FixedEntitlements(entitlements), quizzes.Object, classRepo.Object), quizzes, classRepo);
    }

    [Fact]
    public async Task A_free_host_may_create_their_first_class()
    {
        var (guard, _, _) = Build(PlanCatalog.For(PlanTier.Free, 2), classes: 0);

        await guard.EnsureCanCreateClassAsync(UserId);
    }

    [Fact]
    public async Task A_free_host_with_a_class_is_refused_a_second_and_pointed_at_Teacher()
    {
        var (guard, _, _) = Build(PlanCatalog.For(PlanTier.Free, 2), classes: 1);

        var ex = await Assert.ThrowsAsync<PlanLimitException>(() => guard.EnsureCanCreateClassAsync(UserId));

        Assert.Equal(PlanLimits.Classes, ex.Limit);
        Assert.Equal(1, ex.Max);
        // Plus also keeps one class, so the cheapest way out is Teacher, not Plus.
        Assert.Equal("Teacher", ex.UpgradeTo);
    }

    /// <summary>A lapsed Teacher over the free limit keeps their Classes; only a new one is refused.</summary>
    [Fact]
    public async Task Being_over_the_limit_refuses_creation_and_nothing_else()
    {
        var (guard, _, _) = Build(PlanCatalog.For(PlanTier.Free, 2), classes: 5);

        await Assert.ThrowsAsync<PlanLimitException>(() => guard.EnsureCanCreateClassAsync(UserId));
    }

    [Fact]
    public async Task Unlimited_costs_no_count_query()
    {
        var (guard, quizzes, classes) = Build(PlanCatalog.For(PlanTier.Teacher, 2));

        await guard.EnsureCanCreateClassAsync(UserId);
        await guard.EnsureCanCreateQuizAsync(UserId);

        classes.Verify(c => c.CountAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        quizzes.Verify(q => q.CountOwnedAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    /// <summary>
    /// Free has no quiz cap (decided 2026-10-10), but the mechanism is live: setting a number in
    /// PlanCatalog is all a cap would take.
    /// </summary>
    [Fact]
    public async Task A_quiz_cap_refuses_at_the_limit_and_points_at_the_cheapest_unlimited_plan()
    {
        var capped = PlanCatalog.For(PlanTier.Free, 2) with { MaxOwnedQuizzes = 25 };
        var (guard, _, _) = Build(capped, ownedQuizzes: 25);

        var ex = await Assert.ThrowsAsync<PlanLimitException>(() => guard.EnsureCanCreateQuizAsync(UserId));

        Assert.Equal(PlanLimits.Quizzes, ex.Limit);
        Assert.Equal(25, ex.Max);
        Assert.Equal("Plus", ex.UpgradeTo);
    }

    [Fact]
    public async Task Free_has_no_quiz_cap()
    {
        var (guard, quizzes, _) = Build(PlanCatalog.For(PlanTier.Free, 2), ownedQuizzes: 10_000);

        await guard.EnsureCanCreateQuizAsync(UserId);

        quizzes.Verify(q => q.CountOwnedAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
