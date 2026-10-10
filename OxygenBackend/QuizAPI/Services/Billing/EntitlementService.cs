using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;

namespace QuizAPI.Services.Billing
{
    public interface IEntitlementService
    {
        /// <summary>The user's limits right now. Cached briefly; see <see cref="EntitlementService"/>.</summary>
        Task<Entitlements> GetAsync(Guid userId, CancellationToken ct = default);

        /// <summary>Drops the cached answer. Every write to a user's subscriptions calls this.</summary>
        void Evict(Guid userId);
    }

    /// <summary>
    /// Resolves a user's effective plan and its limits (docs/auth/paid-plans.md).
    ///
    /// <para><b>The effective plan is computed, never stored.</b> A subscription counts while it is
    /// Active, Trialing or PastDue; a Canceled or Paused one counts until its period ends; a manual
    /// grant counts until revoked or until its end date. The best tier among the ones that count
    /// wins. Nothing has to run when a period ends — the next read simply stops counting it.</para>
    ///
    /// <para><b>Cached for a minute per user.</b> Every limit check reads this, including the hub on
    /// lobby create, so it must not be a query per call. Subscription writes evict explicitly; the
    /// short lifetime is what covers the two changes that don't — a period ending, and a role change
    /// making someone staff. Neither needs to land faster than a minute.</para>
    ///
    /// <para><b>Not in the JWT.</b> A token would carry a stale plan until it refreshed, so a purchase
    /// would appear not to work. The client reads <c>GET /api/plans/me</c> instead.</para>
    /// </summary>
    public sealed class EntitlementService : IEntitlementService
    {
        internal static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(1);

        private static readonly HashSet<string> StaffRoles =
            new(StringComparer.OrdinalIgnoreCase) { "Admin", "SuperAdmin" };

        private readonly ISubscriptionRepository _subscriptions;
        private readonly IUserRepository _users;
        private readonly IMemoryCache _cache;
        private readonly TimeProvider _clock;
        private readonly AiOptions _ai;

        public EntitlementService(
            ISubscriptionRepository subscriptions,
            IUserRepository users,
            IMemoryCache cache,
            TimeProvider clock,
            IOptions<AiOptions> ai)
        {
            _subscriptions = subscriptions;
            _users = users;
            _cache = cache;
            _clock = clock;
            _ai = ai.Value;
        }

        public async Task<Entitlements> GetAsync(Guid userId, CancellationToken ct = default)
        {
            if (_cache.TryGetValue(CacheKey(userId), out Entitlements? cached) && cached is not null)
                return cached;

            var subscriptions = await _subscriptions.ListForUserAsync(userId, ct);
            var user = await _users.GetByIdAsync(userId, tracked: false, ct);
            var isStaff = user?.UserRoles
                .Any(ur => ur.Role is not null && StaffRoles.Contains(ur.Role.Name)) == true;

            var now = _clock.GetUtcNow().UtcDateTime;
            var best = subscriptions
                .Where(s => Counts(s, now))
                .OrderByDescending(s => s.Plan)
                .ThenByDescending(s => s.CurrentPeriodEnd ?? DateTime.MaxValue)
                .FirstOrDefault();
            var plan = best?.Plan ?? PlanTier.Free;

            var entitlements = (isStaff
                    ? PlanCatalog.ForStaff(plan, _ai.DefaultDailyQuota)
                    : PlanCatalog.For(plan, _ai.DefaultDailyQuota))
                with
                {
                    PlanEndsAt = best?.CurrentPeriodEnd,
                    CancelAtPeriodEnd = best?.CancelAtPeriodEnd ?? false,
                    Provider = best?.Provider.ToString(),
                };

            _cache.Set(CacheKey(userId), entitlements, CacheLifetime);
            return entitlements;
        }

        public void Evict(Guid userId) => _cache.Remove(CacheKey(userId));

        /// <summary>
        /// Whether one subscription grants its plan at <paramref name="now"/>. Public so the rule
        /// has exactly one implementation — the admin view and the tests use it too.
        /// </summary>
        public static bool Counts(UserSubscription s, DateTime now)
        {
            var periodRunning = s.CurrentPeriodEnd is null || now < s.CurrentPeriodEnd;

            return s.Status switch
            {
                // A provider subscription in these states is paid up or being retried. The period
                // end is a renewal date, not an expiry — past it, the provider decides, not us.
                SubscriptionStatus.Active or SubscriptionStatus.Trialing or SubscriptionStatus.PastDue
                    => s.Provider != SubscriptionProvider.Manual || periodRunning,
                // Canceled or paused: keeps the plan for what was already paid for.
                _ => s.CurrentPeriodEnd is not null && now < s.CurrentPeriodEnd,
            };
        }

        private static string CacheKey(Guid userId) => $"entitlements:user:{userId}";
    }
}
