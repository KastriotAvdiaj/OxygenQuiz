using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Npgsql;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Billing;
using QuizAPI.Services.Interfaces;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// Two webhook deliveries for the same brand-new subscription (<c>created</c> and
/// <c>activated</c>, typically) can race: both read "no row yet," both try to insert, and the
/// loser hits <c>IX_UserSubscriptions_ProviderSubscriptionId</c>'s unique constraint. These tests
/// drive that race deterministically — via a mocked repository, not real Postgres timing — to
/// prove <c>SubscriptionSyncService</c> retries as an update instead of surfacing a 500 that would
/// otherwise drop a real customer's webhook event.
/// </summary>
public class SubscriptionRaceTests
{
    private static readonly DateTime Now = new(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid UserId = Guid.NewGuid();
    private const string SubscriptionId = "sub_race_1";

    private static DbUpdateException UniqueViolation() =>
        new("insert failed", new PostgresException(
            messageText: "duplicate key value violates unique constraint \"IX_UserSubscriptions_ProviderSubscriptionId\"",
            severity: "ERROR", invariantSeverity: "ERROR", sqlState: "23505"));

    private static ProviderSubscription Sub(SubscriptionStatus status) =>
        new(SubscriptionId, "ctm_1", "pri_plus_month", UserId, PlanTier.Plus, status,
            BillingInterval.Month, Now.AddDays(30), false);

    [Fact]
    public async Task A_concurrent_insert_race_retries_as_an_update_instead_of_throwing()
    {
        var provider = new Mock<IBillingProvider>();
        provider.Setup(p => p.GetSubscriptionAsync(SubscriptionId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Sub(SubscriptionStatus.Active));

        // First read: no row (this delivery thinks it's the first). Second read, after the
        // simulated unique-violation: the row the *other* concurrent delivery already committed.
        var winnersRow = new UserSubscription
        {
            Id = Guid.NewGuid(), UserId = UserId, Provider = SubscriptionProvider.Paddle,
            Plan = PlanTier.Plus, Status = SubscriptionStatus.Active, ProviderSubscriptionId = SubscriptionId,
            CreatedAt = Now, UpdatedAt = Now,
        };
        var subscriptions = new Mock<ISubscriptionRepository>();
        subscriptions.SetupSequence(s => s.GetByProviderSubscriptionIdAsync(SubscriptionId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserSubscription?)null)
            .ReturnsAsync(winnersRow);
        subscriptions.SetupSequence(s => s.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(UniqueViolation())
            .ReturnsAsync(1);

        var users = new Mock<IUserRepository>();
        var userService = new Mock<IUserService>();
        var entitlements = new Mock<IEntitlementService>();
        var audit = new Mock<IAuditService>();
        var notifications = new Mock<INotificationService>();
        var clock = new FakeTimeProvider(new DateTimeOffset(Now));

        var service = new SubscriptionSyncService(
            provider.Object, subscriptions.Object, users.Object, userService.Object,
            entitlements.Object, audit.Object, notifications.Object, clock);

        // The real assertion: this does not throw. Before the fix, the unique-violation on the
        // first SaveChanges propagated straight out of SyncAsync as an unhandled DbUpdateException
        // — a dropped webhook event masquerading as a 500.
        await service.SyncAsync(SubscriptionId, CancellationToken.None);

        subscriptions.Verify(s => s.Detach(It.IsAny<UserSubscription>()), Times.Once);
        subscriptions.Verify(s => s.AddAsync(It.IsAny<UserSubscription>(), It.IsAny<CancellationToken>()), Times.Once);
        subscriptions.Verify(s => s.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Exactly(2));

        // The retry found an existing (Active) row with the same plan/status the fresh read
        // returns, so this is the "nothing changed" update path, not a second "started" — matches
        // what the *winning* delivery already audited as SubscriptionStarted.
        audit.Verify(a => a.LogAsync(AuditActions.SubscriptionStarted, It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task A_second_failure_after_the_retry_is_not_swallowed()
    {
        var provider = new Mock<IBillingProvider>();
        provider.Setup(p => p.GetSubscriptionAsync(SubscriptionId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Sub(SubscriptionStatus.Active));

        var subscriptions = new Mock<ISubscriptionRepository>();
        // Every read says "no row yet" — an unrealistic, pathological case (the constraint keeps
        // firing but the row is never visible to this delivery) — the point is that the catch
        // filter only matches the *first* attempt (`isNew` at the call it guards), so a second
        // failure is a genuine problem and must still surface, not loop or get swallowed.
        subscriptions.Setup(s => s.GetByProviderSubscriptionIdAsync(SubscriptionId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserSubscription?)null);
        subscriptions.Setup(s => s.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(UniqueViolation());

        var service = new SubscriptionSyncService(
            provider.Object, subscriptions.Object, new Mock<IUserRepository>().Object, new Mock<IUserService>().Object,
            new Mock<IEntitlementService>().Object, new Mock<IAuditService>().Object,
            new Mock<INotificationService>().Object, new FakeTimeProvider(new DateTimeOffset(Now)));

        await Assert.ThrowsAsync<DbUpdateException>(() => service.SyncAsync(SubscriptionId, CancellationToken.None));
        subscriptions.Verify(s => s.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Exactly(2));
    }
}
