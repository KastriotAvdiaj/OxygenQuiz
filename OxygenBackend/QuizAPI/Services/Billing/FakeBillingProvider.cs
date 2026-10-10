using Microsoft.Extensions.Options;
using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// The development/CI/E2E stand-in for Paddle (docs/proposals/paid-plans-and-payments.md §5.8).
    /// Refused in Production (<c>Program.cs</c> start-up guard).
    ///
    /// <para><b>No state store, and that's the point.</b> The checkout "transaction id" is a
    /// self-describing string encoding everything <see cref="GetSubscriptionAsync"/> needs to parse
    /// back out — including the real price id, resolved through the same
    /// <see cref="BillingPriceCatalog"/> a real Paddle subscription is resolved through.
    /// <c>BillingController.Checkout</c> passes that same id straight into
    /// <see cref="ISubscriptionSyncService.SyncAsync"/> before returning, so a fake purchase runs
    /// through the exact upsert path a real Paddle webhook would later trigger — dev, CI and the
    /// E2E suite exercise the real entitlement logic with no Paddle account, per the proposal.</para>
    /// </summary>
    public sealed class FakeBillingProvider : IBillingProvider
    {
        private const string Prefix = "fake";

        private readonly BillingOptions _options;

        public FakeBillingProvider(IOptions<BillingOptions> options) => _options = options.Value;

        public Task<string> CreateCheckoutTransactionAsync(Guid userId, string userEmail, string priceId, CancellationToken ct = default) =>
            Task.FromResult($"{Prefix}:{userId}:{priceId}:{Guid.NewGuid():N}");

        public Task<string> CreatePortalSessionAsync(string customerId, CancellationToken ct = default) =>
            Task.FromResult($"about:blank#fake-portal-{customerId}");

        public Task<ProviderSubscription> GetSubscriptionAsync(string subscriptionId, CancellationToken ct = default)
        {
            var parts = subscriptionId.Split(':');
            if (parts.Length != 4 || parts[0] != Prefix || !Guid.TryParse(parts[1], out var userId))
                throw new BillingProviderException($"'{subscriptionId}' is not a Fake provider subscription id.");

            var priceId = parts[2];
            if (!BillingPriceCatalog.TryResolve(_options.Prices, priceId, out var plan, out var interval))
                throw new BillingProviderException($"'{priceId}' does not match any configured Billing:Prices entry.");

            return Task.FromResult(new ProviderSubscription(
                SubscriptionId: subscriptionId,
                CustomerId: $"fake-customer:{userId}",
                PriceId: priceId,
                UserId: userId,
                Plan: plan,
                Status: SubscriptionStatus.Active,
                Interval: interval,
                CurrentPeriodEnd: null,
                CancelAtPeriodEnd: false));
        }
    }
}
