using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.User;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Billing;
using QuizAPI.Services.Interfaces;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// The one upsert path a Paddle webhook, the reconciliation job and a Fake checkout all share
/// (docs/proposals/paid-plans-and-payments.md §5.5). Reads come from a mocked
/// <see cref="IBillingProvider"/> — never a payload — same as production.
/// </summary>
public class SubscriptionSyncServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc);

    private sealed class World
    {
        private readonly string _db = Guid.NewGuid().ToString();
        public string[] Roles = { "User" };
        public readonly Mock<IBillingProvider> Provider = new();
        public readonly Mock<IUserService> UserService = new();
        public readonly Mock<IAuditService> Audit = new();
        public readonly Mock<INotificationService> Notifications = new();
        public readonly Mock<IEntitlementService> Entitlements = new();
        private readonly FakeTimeProvider _clock = new(new DateTimeOffset(Now));

        public async Task Sync(ProviderSubscription sub)
        {
            Provider.Setup(p => p.GetSubscriptionAsync(sub.SubscriptionId, It.IsAny<CancellationToken>())).ReturnsAsync(sub);

            await using var ctx = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db).Options, new TestCurrentUserService());
            var users = new Mock<IUserRepository>();
            users.Setup(u => u.GetByIdAsync(sub.UserId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(() => BillingTestUsers.With(sub.UserId, Roles));

            var subscriptions = new SubscriptionRepository(ctx);
            var service = new SubscriptionSyncService(
                Provider.Object, subscriptions, users.Object, UserService.Object,
                Entitlements.Object, Audit.Object, Notifications.Object, _clock);

            await service.SyncAsync(sub.SubscriptionId, CancellationToken.None);
        }

        public async Task<UserSubscription?> Row(string subscriptionId)
        {
            await using var ctx = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db).Options, new TestCurrentUserService());
            return await ctx.UserSubscriptions.AsNoTracking().FirstOrDefaultAsync(s => s.ProviderSubscriptionId == subscriptionId);
        }
    }

    private static ProviderSubscription Sub(
        Guid userId, string id, PlanTier plan, SubscriptionStatus status,
        BillingInterval interval = BillingInterval.Month, DateTime? periodEnd = null, bool cancelAtPeriodEnd = false) =>
        new(id, $"ctm_{userId:N}", $"pri_{plan}", userId, plan, status, interval, periodEnd ?? Now.AddDays(30), cancelAtPeriodEnd);

    [Fact]
    public async Task A_new_subscription_creates_a_row_and_audits_started()
    {
        var w = new World();
        var userId = Guid.NewGuid();
        var sub = Sub(userId, "sub_1", PlanTier.Plus, SubscriptionStatus.Active);

        await w.Sync(sub);

        var row = await w.Row("sub_1");
        Assert.NotNull(row);
        Assert.Equal(PlanTier.Plus, row!.Plan);
        Assert.Equal(SubscriptionProvider.Paddle, row.Provider);
        w.Audit.Verify(a => a.LogAsync(AuditActions.SubscriptionStarted, "User", userId.ToString(),
            It.IsAny<object?>(), It.IsAny<object?>(), userId, It.IsAny<CancellationToken>()), Times.Once);
        w.Notifications.Verify(n => n.CreateAsync(userId, "system", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        w.Entitlements.Verify(e => e.Evict(userId), Times.Once);
    }

    [Fact]
    public async Task Repeating_the_same_sync_is_idempotent()
    {
        var w = new World();
        var userId = Guid.NewGuid();
        var sub = Sub(userId, "sub_2", PlanTier.Plus, SubscriptionStatus.Active);

        await w.Sync(sub);
        await w.Sync(sub); // identical read-back, nothing changed

        w.Audit.Verify(a => a.LogAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
        w.Notifications.Verify(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_Teacher_purchase_grants_the_role_once()
    {
        var w = new World();
        var userId = Guid.NewGuid();
        var sub = Sub(userId, "sub_3", PlanTier.Teacher, SubscriptionStatus.Active);

        await w.Sync(sub);

        w.UserService.Verify(u => u.SetUserRolesAsync(userId,
            It.Is<SetUserRolesDTO>(d => d.Roles.Contains("User") && d.Roles.Contains("Teacher")),
            false, userId, It.IsAny<CancellationToken>()), Times.Once);
        w.Audit.Verify(a => a.LogAsync(AuditActions.TeacherAccessGrantedByPurchase, "User", userId.ToString(),
            It.IsAny<object?>(), It.IsAny<object?>(), userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_buyer_who_already_hosts_is_not_granted_the_role_again()
    {
        var w = new World { Roles = new[] { "User", "Teacher" } };
        var userId = Guid.NewGuid();
        var sub = Sub(userId, "sub_4", PlanTier.Teacher, SubscriptionStatus.Active);

        await w.Sync(sub);

        w.UserService.Verify(u => u.SetUserRolesAsync(It.IsAny<Guid>(), It.IsAny<SetUserRolesDTO>(),
            It.IsAny<bool>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Cancelling_a_Teacher_subscription_never_revokes_the_role()
    {
        var w = new World();
        var userId = Guid.NewGuid();
        var active = Sub(userId, "sub_5", PlanTier.Teacher, SubscriptionStatus.Active);
        await w.Sync(active);

        // The role grant actually happened in production; simulate that here since the mocked
        // IUserService doesn't mutate anything on its own (ADR 0026: the grant is one-way).
        w.Roles = new[] { "User", "Teacher" };

        var canceled = Sub(userId, "sub_5", PlanTier.Teacher, SubscriptionStatus.Canceled, periodEnd: Now.AddDays(5));
        await w.Sync(canceled);

        w.UserService.Verify(u => u.SetUserRolesAsync(It.IsAny<Guid>(), It.IsAny<SetUserRolesDTO>(),
            It.IsAny<bool>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once); // from the first sync only
        w.Audit.Verify(a => a.LogAsync(AuditActions.SubscriptionCanceled, "User", userId.ToString(),
            It.IsAny<object?>(), It.IsAny<object?>(), userId, It.IsAny<CancellationToken>()), Times.Once);

        var row = await w.Row("sub_5");
        Assert.Equal(SubscriptionStatus.Canceled, row!.Status);
    }

    [Fact]
    public async Task A_plan_change_is_audited_and_notified_again()
    {
        var w = new World();
        var userId = Guid.NewGuid();
        await w.Sync(Sub(userId, "sub_6", PlanTier.Plus, SubscriptionStatus.Active));
        await w.Sync(Sub(userId, "sub_6", PlanTier.Teacher, SubscriptionStatus.Active));

        w.Audit.Verify(a => a.LogAsync(AuditActions.SubscriptionChanged, "User", userId.ToString(),
            It.IsAny<object?>(), It.IsAny<object?>(), userId, It.IsAny<CancellationToken>()), Times.Once);
        w.Notifications.Verify(n => n.CreateAsync(userId, "system", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(2));

        var row = await w.Row("sub_6");
        Assert.Equal(PlanTier.Teacher, row!.Plan);
    }
}
