using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly ApplicationDbContext _context;

        public RefreshTokenRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(RefreshToken token, CancellationToken ct = default) =>
            await _context.RefreshTokens.AddAsync(token, ct);

        public Task<RefreshToken?> GetActiveByHashAsync(string tokenHash, CancellationToken ct = default) =>
            _context.RefreshTokens
                .FirstOrDefaultAsync(t =>
                    t.TokenHash == tokenHash &&
                    t.RevokedAt == null &&
                    t.ExpiresAt > DateTime.UtcNow, ct);

        public async Task<int> RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)
        {
            var active = await _context.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ToListAsync(ct);

            foreach (var t in active)
                t.RevokedAt = DateTime.UtcNow;

            return active.Count;
        }

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
