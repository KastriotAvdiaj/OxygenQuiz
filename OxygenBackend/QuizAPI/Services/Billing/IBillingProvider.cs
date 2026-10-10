using QuizAPI.Models.Billing;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// A subscription as the provider sees it right now. <see cref="SubscriptionSyncService"/>
    /// upserts <see cref="UserSubscription"/> from this — never from a webhook payload — per
    /// docs/proposals/paid-plans-and-payments.md §5.5.
    /// </summary>
    public sealed record ProviderSubscription(
        string SubscriptionId,
        string? CustomerId,
        string? PriceId,
        Guid UserId,
        PlanTier Plan,
        SubscriptionStatus Status,
        BillingInterval Interval,
        DateTime? CurrentPeriodEnd,
        bool CancelAtPeriodEnd);

    /// <summary>
    /// The payment provider seam (docs/proposals/paid-plans-and-payments.md §5.8). Checkout opens a
    /// transaction server-side so the user id can't be forged by the browser (§5.4); the portal and
    /// the subscription read-back are what keep our data in sync with the provider's.
    /// </summary>
    public interface IBillingProvider
    {
        /// <summary>Opens a transaction for one price, tagged with the caller's own user id. Returns the transaction id to pass to Paddle.js.</summary>
        Task<string> CreateCheckoutTransactionAsync(Guid userId, string userEmail, string priceId, CancellationToken ct = default);

        /// <summary>A Paddle-hosted session URL where the customer can manage their subscription.</summary>
        Task<string> CreatePortalSessionAsync(string customerId, CancellationToken ct = default);

        /// <summary>Reads the subscription back from the provider. The only source of truth for a sync.</summary>
        Task<ProviderSubscription> GetSubscriptionAsync(string subscriptionId, CancellationToken ct = default);
    }
}
