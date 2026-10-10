using Microsoft.EntityFrameworkCore;
using Npgsql;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.DTOs.User;
using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Interfaces;
using QuizAPI.Services.Roles;

namespace QuizAPI.Services.Billing
{
    public interface ISubscriptionSyncService
    {
        /// <summary>
        /// Reads the subscription back from the provider and upserts <see cref="UserSubscription"/>
        /// from *that* — never from a webhook payload (docs/proposals/paid-plans-and-payments.md
        /// §5.5). Called by the webhook, the daily reconciliation job, and — for the Fake provider —
        /// synchronously by <c>BillingController.Checkout</c>, so there is exactly one upsert path.
        /// </summary>
        Task SyncAsync(string providerSubscriptionId, CancellationToken ct = default);
    }

    /// <summary>
    /// The single place a Paddle (or Fake) subscription becomes a <see cref="UserSubscription"/>
    /// row. Matches by <c>ProviderSubscriptionId</c>, keys a new row by the provider's own
    /// <c>UserId</c> — never email, per §5.4 — and grants the Teacher role on a Teacher purchase
    /// the same one-way way <see cref="ManualPlanService"/> does for a manual grant (ADR 0026).
    /// </summary>
    public sealed class SubscriptionSyncService : ISubscriptionSyncService
    {
        private readonly IBillingProvider _provider;
        private readonly ISubscriptionRepository _subscriptions;
        private readonly IUserRepository _users;
        private readonly IUserService _userService;
        private readonly IEntitlementService _entitlements;
        private readonly IAuditService _audit;
        private readonly INotificationService _notifications;
        private readonly TimeProvider _clock;

        public SubscriptionSyncService(
            IBillingProvider provider,
            ISubscriptionRepository subscriptions,
            IUserRepository users,
            IUserService userService,
            IEntitlementService entitlements,
            IAuditService audit,
            INotificationService notifications,
            TimeProvider clock)
        {
            _provider = provider;
            _subscriptions = subscriptions;
            _users = users;
            _userService = userService;
            _entitlements = entitlements;
            _audit = audit;
            _notifications = notifications;
            _clock = clock;
        }

        private DateTime Now => _clock.GetUtcNow().UtcDateTime;

        public async Task SyncAsync(string providerSubscriptionId, CancellationToken ct = default)
        {
            var sub = await _provider.GetSubscriptionAsync(providerSubscriptionId, ct);
            var (row, isNew, oldPlan, oldStatus) = await UpsertRowAsync(sub, ct);

            _entitlements.Evict(sub.UserId);

            // A Teacher plan without the Teacher role would sell Classes the buyer can't open. The
            // grant is one-way: cancelling or lapsing the subscription never removes it (ADR 0026) —
            // same shape as ManualPlanService.SetAsync's grant for a manual Teacher plan.
            if (sub.Plan == PlanTier.Teacher && EntitlementService.Counts(row, Now))
            {
                var user = await _users.GetByIdAsync(sub.UserId, ct: ct)
                    ?? throw new NotFoundException($"Paddle subscription {providerSubscriptionId} references a user that does not exist.");

                if (!RoleRules.CanHost(user.UserRoles.Select(ur => ur.Role?.Name)))
                {
                    var roles = user.UserRoles.Select(ur => ur.Role.Name).Append(RoleRules.Teacher).ToList();
                    await _userService.SetUserRolesAsync(
                        sub.UserId, new SetUserRolesDTO { Roles = roles }, callerIsSuperAdmin: false, callerId: sub.UserId, ct);
                    await _audit.LogAsync(AuditActions.TeacherAccessGrantedByPurchase, entity: "User", entityId: sub.UserId.ToString(),
                        newValue: new { SubscriptionId = sub.SubscriptionId }, userId: sub.UserId, ct: ct);
                }
            }

            if (isNew)
            {
                await _audit.LogAsync(AuditActions.SubscriptionStarted, entity: "User", entityId: sub.UserId.ToString(),
                    newValue: new { Plan = sub.Plan.ToString(), sub.Status, sub.Interval }, userId: sub.UserId, ct: ct);
            }
            else if (sub.Status == SubscriptionStatus.Canceled && oldStatus != SubscriptionStatus.Canceled)
            {
                await _audit.LogAsync(AuditActions.SubscriptionCanceled, entity: "User", entityId: sub.UserId.ToString(),
                    oldValue: new { Plan = oldPlan?.ToString(), Status = oldStatus?.ToString() }, userId: sub.UserId, ct: ct);
            }
            else if (oldPlan != sub.Plan || oldStatus != sub.Status)
            {
                await _audit.LogAsync(AuditActions.SubscriptionChanged, entity: "User", entityId: sub.UserId.ToString(),
                    oldValue: new { Plan = oldPlan?.ToString(), Status = oldStatus?.ToString() },
                    newValue: new { Plan = sub.Plan.ToString(), Status = sub.Status.ToString() }, userId: sub.UserId, ct: ct);
            }

            if (isNew || oldPlan != sub.Plan)
            {
                await _notifications.CreateAsync(sub.UserId, "system", $"You're on the {sub.Plan} plan",
                    sub.Plan == PlanTier.Teacher
                        ? "Your account now has the Teacher plan: more AI quizzes, bigger lobbies and unlimited Classes. Sign in again if you don't see the Classroom section yet."
                        : "Your account now has the Plus plan: more AI quizzes a day and bigger lobbies.",
                    ct);
            }
        }

        /// <summary>
        /// Writes <paramref name="sub"/> onto the matching row, inserting one if none exists yet.
        ///
        /// <para><b>Check-then-insert isn't atomic, and Paddle doesn't wait to find out.</b> Two
        /// events for a brand-new subscription (<c>created</c> and <c>activated</c>, typically)
        /// can be delivered within milliseconds of each other. Both webhook requests can read "no
        /// row exists yet" before either commits, both try to <c>INSERT</c>, and the second hits
        /// <c>IX_UserSubscriptions_ProviderSubscriptionId</c>'s unique constraint — not a flaky
        /// failure, a real race. Catching that specific violation once and retrying as the update
        /// it should have been keeps a concurrent first delivery from ever surfacing as a dropped
        /// webhook event: the loser detaches its half-written insert, re-reads (now finding the
        /// winner's committed row, which Postgres' read-committed isolation guarantees is visible
        /// by the time this retries), and updates it instead.
        /// </para>
        ///
        /// <para><b>Bounded to exactly one retry</b> via <paramref name="isRetry"/>, rather than
        /// trusting that guarantee to also bound the recursion — a second failure is a genuine
        /// problem (not another instance of this same race) and must surface as a retried webhook
        /// delivery, not loop or get silently swallowed.</para>
        /// </summary>
        private async Task<(UserSubscription Row, bool IsNew, PlanTier? OldPlan, SubscriptionStatus? OldStatus)> UpsertRowAsync(
            ProviderSubscription sub, CancellationToken ct, bool isRetry = false)
        {
            var row = await _subscriptions.GetByProviderSubscriptionIdAsync(sub.SubscriptionId, tracked: true, ct);
            var isNew = row is null;
            var oldPlan = row?.Plan;
            var oldStatus = row?.Status;

            if (row is null)
            {
                row = new UserSubscription
                {
                    Id = Guid.NewGuid(),
                    UserId = sub.UserId,
                    Provider = SubscriptionProvider.Paddle,
                    CreatedAt = Now,
                };
                await _subscriptions.AddAsync(row, ct);
            }

            row.Plan = sub.Plan;
            row.Status = sub.Status;
            row.Interval = sub.Interval;
            row.CurrentPeriodEnd = sub.CurrentPeriodEnd;
            row.CancelAtPeriodEnd = sub.CancelAtPeriodEnd;
            row.ProviderCustomerId = sub.CustomerId;
            row.ProviderSubscriptionId = sub.SubscriptionId;
            row.ProviderPriceId = sub.PriceId;
            row.UpdatedAt = Now;

            try
            {
                await _subscriptions.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (!isRetry && isNew && IsSubscriptionIdUniqueViolation(ex))
            {
                _subscriptions.Detach(row);
                return await UpsertRowAsync(sub, ct, isRetry: true);
            }

            return (row, isNew, oldPlan, oldStatus);
        }

        /// <summary>
        /// Postgres' "unique_violation" class. Not narrowed to
        /// <c>IX_UserSubscriptions_ProviderSubscriptionId</c> by name — <c>PostgresException.ConstraintName</c>
        /// has an internal setter in this Npgsql version, so it can't be constructed in a test — but
        /// this method only ever saves <see cref="UserSubscription"/> changes, so any 23505 raised by
        /// <see cref="ISubscriptionRepository.SaveChangesAsync"/> from here is that index.
        /// </summary>
        private static bool IsSubscriptionIdUniqueViolation(DbUpdateException ex) =>
            ex.InnerException is PostgresException { SqlState: "23505" };
    }
}
