using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class BillingWebhookEventRepository : IBillingWebhookEventRepository
    {
        private readonly ApplicationDbContext _context;

        public BillingWebhookEventRepository(ApplicationDbContext context) => _context = context;

        public Task<BillingWebhookEvent?> GetAsync(string eventId, CancellationToken ct = default) =>
            _context.BillingWebhookEvents.FirstOrDefaultAsync(e => e.EventId == eventId, ct);

        public async Task AddAsync(BillingWebhookEvent evt, CancellationToken ct = default) =>
            await _context.BillingWebhookEvents.AddAsync(evt, ct);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
