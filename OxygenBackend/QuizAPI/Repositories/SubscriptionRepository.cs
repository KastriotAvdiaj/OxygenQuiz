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

        public async Task AddAsync(UserSubscription subscription, CancellationToken ct = default) =>
            await _context.UserSubscriptions.AddAsync(subscription, ct);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
