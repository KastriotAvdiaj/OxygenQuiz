using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class PasswordResetTokenRepository : IPasswordResetTokenRepository
    {
        private readonly ApplicationDbContext _context;

        public PasswordResetTokenRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(PasswordResetToken token, CancellationToken ct = default) =>
            await _context.PasswordResetTokens.AddAsync(token, ct);

        public Task<PasswordResetToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default) =>
            _context.PasswordResetTokens
                .FirstOrDefaultAsync(t =>
                    t.TokenHash == tokenHash &&
                    t.ConsumedAt == null &&
                    t.ExpiresAt > DateTime.UtcNow, ct);

        public async Task<int> InvalidateActiveForUserAsync(Guid userId, CancellationToken ct = default)
        {
            var active = await _context.PasswordResetTokens
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
