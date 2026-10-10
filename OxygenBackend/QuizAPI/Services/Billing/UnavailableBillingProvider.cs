using QuizAPI.Exceptions;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// Registered in place of a real provider when <c>Billing:Enabled</c> is false (ADR 0004: "a
    /// misconfigured provider turns the feature off, not crash"). The pricing page already hides
    /// checkout behind <c>PlanCatalogDTO.CheckoutAvailable</c>, so reaching this class means a
    /// caller got to <c>/api/billing</c> anyway — the same "gate is missing somewhere" situation
    /// <see cref="Ai.UnavailableQuizAiProvider"/> guards for the AI seam.
    /// </summary>
    public sealed class UnavailableBillingProvider : IBillingProvider
    {
        private readonly ILogger<UnavailableBillingProvider> _logger;

        public UnavailableBillingProvider(ILogger<UnavailableBillingProvider> logger) => _logger = logger;

        public Task<string> CreateCheckoutTransactionAsync(Guid userId, string userEmail, string priceId, CancellationToken ct = default) =>
            throw Unavailable();

        public Task<string> CreatePortalSessionAsync(string customerId, CancellationToken ct = default) =>
            throw Unavailable();

        public Task<ProviderSubscription> GetSubscriptionAsync(string subscriptionId, CancellationToken ct = default) =>
            throw Unavailable();

        private BillingUnavailableException Unavailable()
        {
            _logger.LogError(
                "A billing call reached the provider while Billing:Enabled is false. A caller is " +
                "missing its CheckoutAvailable gate.");
            return new BillingUnavailableException("Billing is not configured on this server.");
        }
    }
}
