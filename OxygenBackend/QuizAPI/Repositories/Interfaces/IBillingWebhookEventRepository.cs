using QuizAPI.Models.Billing;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>Paddle webhook deliveries, kept for idempotency (docs/auth/paid-plans.md §5.5).</summary>
    public interface IBillingWebhookEventRepository
    {
        Task<BillingWebhookEvent?> GetAsync(string eventId, CancellationToken ct = default);
        Task AddAsync(BillingWebhookEvent evt, CancellationToken ct = default);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
