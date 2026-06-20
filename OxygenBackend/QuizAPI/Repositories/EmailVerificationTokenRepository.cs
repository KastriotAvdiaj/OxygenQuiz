using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class EmailVerificationTokenRepository : IEmailVerificationTokenRepository
    {
        private readonly ApplicationDbContext _context;

        public EmailVerificationTokenRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(EmailVerificationToken token, CancellationToken ct = default) =>
            await _context.EmailVerificationTokens.AddAsync(token, ct);

        public Task<EmailVerificationToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default) =>
            _context.EmailVerificationTokens
                .FirstOrDefaultAsync(t =>
                    t.TokenHash == tokenHash &&
                    t.ConsumedAt == null &&
                    t.ExpiresAt > DateTime.UtcNow, ct);

        public async Task<int> InvalidateActiveForUserAsync(Guid userId, CancellationToken ct = default)
        {
            var active = await _context.EmailVerificationTokens
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
