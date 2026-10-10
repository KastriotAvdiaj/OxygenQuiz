using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class SubscriptionRepository : ISubscriptionRepository
    {
        private readonly ApplicationDbContext _context;

        public SubscriptionRepository(ApplicationDbContext context) => _context = context;

        public async Task<IReadOnlyList<UserSubscription>> ListForUserAsync(Guid userId, CancellationToken ct = default) =>
            await _context.UserSubscriptions.AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync(ct);

        public Task<UserSubscription?> GetManualAsync(Guid userId, bool tracked = false, CancellationToken ct = default)
        {
            var q = _context.UserSubscriptions.AsQueryable();
            if (!tracked) q = q.AsNoTracking();
            return q.FirstOrDefaultAsync(s => s.UserId == userId && s.Provider == SubscriptionProvider.Manual, ct);
        }

        public Task<UserSubscription?> GetByProviderSubscriptionIdAsync(string providerSubscriptionId, bool tracked = false, CancellationToken ct = default)
        {
            var q = _context.UserSubscriptions.AsQueryable();
            if (!tracked) q = q.AsNoTracking();
            return q.FirstOrDefaultAsync(s => s.ProviderSubscriptionId == providerSubscriptionId, ct);
        }

        public async Task<IReadOnlyList<UserSubscription>> ListAllPaddleSubscriptionsAsync(CancellationToken ct = default) =>
            await _context.UserSubscriptions.AsNoTracking()
                .Where(s => s.Provider == SubscriptionProvider.Paddle && s.ProviderSubscriptionId != null)
                .ToListAsync(ct);

        public Task<string?> GetCustomerIdAsync(Guid userId, CancellationToken ct = default) =>
            _context.UserSubscriptions.AsNoTracking()
                .Where(s => s.UserId == userId && s.ProviderCustomerId != null)
                .OrderByDescending(s => s.UpdatedAt)
                .Select(s => s.ProviderCustomerId)
                .FirstOrDefaultAsync(ct);

        public async Task AddAsync(UserSubscription subscription, CancellationToken ct = default) =>
            await _context.UserSubscriptions.AddAsync(subscription, ct);

        public void Detach(UserSubscription subscription) =>
            _context.Entry(subscription).State = EntityState.Detached;

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
