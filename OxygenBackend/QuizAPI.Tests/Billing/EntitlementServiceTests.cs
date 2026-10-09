using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Billing;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// The effective plan is computed from a user's subscriptions on every (uncached) read, never
/// stored — so a plan lapses by the clock alone (docs/auth/paid-plans.md, "The effective plan").
/// Each row of that rule is a case here.
/// </summary>
public class EntitlementServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid UserId = Guid.NewGuid();

    private sealed class World
    {
        public readonly List<UserSubscription> Subscriptions = new();
        public readonly Mock<ISubscriptionRepository> Repo = new();
        public string[] Roles = { "User" };
        public int FreeAi = 2;
        public readonly MemoryCache Cache = new(new MemoryCacheOptions());

        public World()
        {
            Repo.Setup(r => r.ListForUserAsync(UserId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => Subscriptions.ToList());
        }

        public EntitlementService Service()
        {
            var users = new Mock<IUserRepository>();
            users.Setup(u => u.GetByIdAsync(UserId, false, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(() => BillingTestUsers.With(UserId, Roles));
            return new EntitlementService(Repo.Object, users.Object, Cache,
                new FakeTimeProvider(new DateTimeOffset(Now)), Options.Create(new AiOptions { DefaultDailyQuota = FreeAi }));
        }

        public World With(PlanTier plan, SubscriptionStatus status, DateTime? periodEnd,
            SubscriptionProvider provider = SubscriptionProvider.Paddle)
        {
            Subscriptions.Add(new UserSubscription
            {
                Id = Guid.NewGuid(), UserId = UserId, Plan = plan, Status = status, Provider = provider,
                CurrentPeriodEnd = periodEnd, CreatedAt = Now.AddDays(-Subscriptions.Count - 1),
            });
            return this;
        }
    }

    [Fact]
    public async Task No_subscription_is_Free_with_the_configured_AI_allowance()
    {
        var w = new World { FreeAi = 3 };

        var e = await w.Service().GetAsync(UserId);

        Assert.Equal(PlanTier.Free, e.Plan);
        Assert.Equal(3, e.AiDailyGenerations);
        Assert.Equal(PlanCatalog.FreeLobbyPlayers, e.MaxLobbyPlayers);
        Assert.Equal(1, e.MaxClasses);
        Assert.Null(e.MaxOwnedQuizzes);
    }

    [Theory]
    [InlineData(SubscriptionStatus.Active, 5, PlanTier.Plus)]
    [InlineData(SubscriptionStatus.Trialing, 5, PlanTier.Plus)]
    // PastDue keeps the plan while the provider retries the card.
    [InlineData(SubscriptionStatus.PastDue, 5, PlanTier.Plus)]
    // A renewal date in the past is the provider's call, not ours: still Active means still paid.
    [InlineData(SubscriptionStatus.Active, -5, PlanTier.Plus)]
    // Canceled or paused: keeps what was paid for, then lapses with no job running.
    [InlineData(SubscriptionStatus.Canceled, 5, PlanTier.Plus)]
    [InlineData(SubscriptionStatus.Canceled, -1, PlanTier.Free)]
    [InlineData(SubscriptionStatus.Paused, 5, PlanTier.Plus)]
    [InlineData(SubscriptionStatus.Paused, -1, PlanTier.Free)]
    public async Task A_provider_subscription_counts_by_its_status_and_period(
        SubscriptionStatus status, int daysToPeriodEnd, PlanTier expected)
    {
        var w = new World().With(PlanTier.Plus, status, Now.AddDays(daysToPeriodEnd));

        Assert.Equal(expected, (await w.Service().GetAsync(UserId)).Plan);
    }

    [Theory]
    [InlineData(null, PlanTier.Teacher)]   // until revoked
    [InlineData(5, PlanTier.Teacher)]
    [InlineData(-1, PlanTier.Free)]        // a dated grant ends on its date
    public async Task A_manual_grant_counts_until_its_end_date(int? daysToEnd, PlanTier expected)
    {
        var w = new World().With(PlanTier.Teacher, SubscriptionStatus.Active,
            daysToEnd is int d ? Now.AddDays(d) : null, SubscriptionProvider.Manual);

        Assert.Equal(expected, (await w.Service().GetAsync(UserId)).Plan);
    }

    [Fact]
    public async Task The_best_counting_plan_wins()
    {
        var w = new World()
            .With(PlanTier.Plus, SubscriptionStatus.Active, Now.AddDays(20))
            .With(PlanTier.Teacher, SubscriptionStatus.Active, null, SubscriptionProvider.Manual)
            .With(PlanTier.Teacher, SubscriptionStatus.Canceled, Now.AddDays(-3));

        var e = await w.Service().GetAsync(UserId);

        Assert.Equal(PlanTier.Teacher, e.Plan);
        Assert.Equal(15, e.AiDailyGenerations);
        Assert.Equal(40, e.MaxLobbyPlayers);
        Assert.Null(e.MaxClasses);
    }

    [Fact]
    public async Task A_canceled_plan_reports_when_it_ends()
    {
        var end = Now.AddDays(9);
        var w = new World().With(PlanTier.Plus, SubscriptionStatus.Canceled, end);
        w.Subscriptions[0].CancelAtPeriodEnd = true;

        var e = await w.Service().GetAsync(UserId);

        Assert.Equal(end, e.PlanEndsAt);
        Assert.True(e.CancelAtPeriodEnd);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("SuperAdmin")]
    public async Task Staff_get_the_top_limits_and_no_daily_AI_count_but_keep_their_real_plan(string role)
    {
        var w = new World { Roles = new[] { role } };

        var e = await w.Service().GetAsync(UserId);

        Assert.True(e.IsStaff);
        Assert.Equal(PlanTier.Free, e.Plan);
        Assert.Null(e.AiDailyGenerations);
        Assert.Null(e.MaxClasses);
        Assert.Equal(PlanCatalog.For(PlanTier.Teacher, 2).MaxLobbyPlayers, e.MaxLobbyPlayers);
    }

    [Fact]
    public async Task A_Teacher_role_alone_is_not_a_Teacher_plan()
    {
        var w = new World { Roles = new[] { "Teacher" } };

        var e = await w.Service().GetAsync(UserId);

        Assert.Equal(PlanTier.Free, e.Plan);
        Assert.False(e.IsStaff);
        Assert.Equal(1, e.MaxClasses);
    }

    [Fact]
    public async Task Reads_are_cached_until_evicted()
    {
        var w = new World();
        var service = w.Service();
        Assert.Equal(PlanTier.Free, (await service.GetAsync(UserId)).Plan);

        w.With(PlanTier.Plus, SubscriptionStatus.Active, Now.AddDays(30));
        Assert.Equal(PlanTier.Free, (await service.GetAsync(UserId)).Plan);

        service.Evict(UserId);
        Assert.Equal(PlanTier.Plus, (await service.GetAsync(UserId)).Plan);
    }
}
