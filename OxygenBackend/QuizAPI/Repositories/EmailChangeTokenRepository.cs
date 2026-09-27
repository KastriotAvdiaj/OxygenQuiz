using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class EmailChangeTokenRepository : IEmailChangeTokenRepository
    {
        private readonly ApplicationDbContext _context;

        public EmailChangeTokenRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(EmailChangeToken token, CancellationToken ct = default) =>
            await _context.EmailChangeTokens.AddAsync(token, ct);

        public Task<EmailChangeToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default) =>
            _context.EmailChangeTokens
                .FirstOrDefaultAsync(t =>
                    t.TokenHash == tokenHash &&
                    t.ConsumedAt == null &&
                    t.ExpiresAt > DateTime.UtcNow, ct);

        public Task<EmailChangeToken?> GetActiveForUserAsync(Guid userId, CancellationToken ct = default) =>
            _context.EmailChangeTokens
                .AsNoTracking()
                .Where(t => t.UserId == userId && t.ConsumedAt == null && t.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync(ct);

        public async Task<int> InvalidateActiveForUserAsync(Guid userId, CancellationToken ct = default)
        {
            var active = await _context.EmailChangeTokens
                .Where(t => t.UserId == userId && t.ConsumedAt == null)
                .ToListAsync(ct);

            foreach (var t in active)
                t.ConsumedAt = DateTime.UtcNow;

            return active.Count;
        }

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
