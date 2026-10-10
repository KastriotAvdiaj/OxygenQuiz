using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// Daily safety net (docs/proposals/paid-plans-and-payments.md §5.5): reads every Paddle
    /// subscription back through <see cref="ISubscriptionSyncService"/>, the same upsert a webhook
    /// triggers. Catches a webhook that never arrived. Registered as a Hangfire recurring job
    /// alongside the other sweepers in <c>Program.cs</c> — a plain DI-injected class, no interface,
    /// matching <c>ImageCleanUpService</c>/<c>AiReservationSweeper</c>.
    /// </summary>
    public sealed class BillingReconciliationJob
    {
        private readonly ISubscriptionRepository _subscriptions;
        private readonly ISubscriptionSyncService _sync;
        private readonly ILogger<BillingReconciliationJob> _logger;

        public BillingReconciliationJob(
            ISubscriptionRepository subscriptions, ISubscriptionSyncService sync, ILogger<BillingReconciliationJob> logger)
        {
            _subscriptions = subscriptions;
            _sync = sync;
            _logger = logger;
        }

        public async Task RunAsync(CancellationToken ct = default)
        {
            var rows = await _subscriptions.ListAllPaddleSubscriptionsAsync(ct);
            foreach (var row in rows)
            {
                try
                {
                    await _sync.SyncAsync(row.ProviderSubscriptionId!, ct);
                }
                catch (Exception ex)
                {
                    // One bad row must not block the rest of the sweep.
                    _logger.LogError(ex, "[Billing] Reconciliation failed for subscription {SubscriptionId}", row.ProviderSubscriptionId);
                }
            }
        }
    }
}
