using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models.Billing
{
    /// <summary>
    /// The paid tiers, plus <see cref="Free"/> for everyone else. What each one gets is
    /// <c>PlanCatalog</c>'s; this enum only names them. Stored as an int, so the order is part of
    /// the schema: append, never reorder.
    /// </summary>
    public enum PlanTier
    {
        Free = 0,
        Plus = 1,
        Teacher = 2,
    }

    /// <summary>
    /// Mirrors the provider's subscription states. <see cref="PastDue"/> keeps its entitlements:
    /// the provider is retrying the card, and a failed renewal is not a reason to take a teacher's
    /// Classes away mid-week (docs/auth/paid-plans.md, "The effective plan").
    /// </summary>
    public enum SubscriptionStatus
    {
        Active = 0,
        Trialing = 1,
        PastDue = 2,
        Paused = 3,
        Canceled = 4,
    }

    /// <summary>Where a subscription came from. Only <see cref="Manual"/> exists until Paddle lands.</summary>
    public enum SubscriptionProvider
    {
        /// <summary>Granted by an admin from the Users table — a comp, a pilot school, a test.</summary>
        Manual = 0,
        Paddle = 1,
        /// <summary>The development and E2E stand-in for a real provider. Refused in Production.</summary>
        Fake = 2,
    }

    public enum BillingInterval
    {
        None = 0,
        Month = 1,
        Year = 2,
    }

    /// <summary>
    /// One subscription a user holds or held. A user can have several rows over time (a lapsed
    /// plan, then a new one); the effective plan is computed from all of them by
    /// <c>EntitlementService</c>, never stored — so nothing has to run at period end for a plan to
    /// lapse, and there is no "expire" job to forget.
    ///
    /// <para>The <c>Provider*</c> columns are empty for <see cref="SubscriptionProvider.Manual"/>
    /// rows and are filled from the provider's API, never from the browser.</para>
    /// </summary>
    public class UserSubscription
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public PlanTier Plan { get; set; }
        public SubscriptionStatus Status { get; set; }
        public SubscriptionProvider Provider { get; set; }
        public BillingInterval Interval { get; set; }

        /// <summary>
        /// When the paid period ends. For a provider subscription this is the next renewal, and a
        /// canceled one keeps its plan until then. Null on a manual grant means "until revoked".
        /// </summary>
        public DateTime? CurrentPeriodEnd { get; set; }

        public bool CancelAtPeriodEnd { get; set; }

        [MaxLength(100)]
        public string? ProviderCustomerId { get; set; }

        [MaxLength(100)]
        public string? ProviderSubscriptionId { get; set; }

        [MaxLength(100)]
        public string? ProviderPriceId { get; set; }

        /// <summary>The admin who granted a manual plan. Null for provider subscriptions.</summary>
        public Guid? GrantedByUserId { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
