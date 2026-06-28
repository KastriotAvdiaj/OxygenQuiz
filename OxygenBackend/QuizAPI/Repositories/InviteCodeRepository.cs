using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class InviteCodeRepository : IInviteCodeRepository
    {
        private readonly ApplicationDbContext _context;

        public InviteCodeRepository(ApplicationDbContext context) => _context = context;

        public async Task AddRangeAsync(IEnumerable<InviteCode> codes, CancellationToken ct = default) =>
            await _context.InviteCodes.AddRangeAsync(codes, ct);

        public Task<InviteCode?> GetRedeemableByHashAsync(string codeHash, CancellationToken ct = default) =>
            _context.InviteCodes
                .FirstOrDefaultAsync(c =>
                    c.CodeHash == codeHash &&
                    c.ConsumedAt == null &&
                    c.RevokedAt == null &&
                    (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow), ct);

        public Task<int> TryConsumeAsync(string codeHash, Guid userId, CancellationToken ct = default) =>
            _context.InviteCodes
                .Where(c => c.CodeHash == codeHash
                         && c.ConsumedAt == null
                         && c.RevokedAt == null
                         && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.ConsumedAt, DateTime.UtcNow)
                    .SetProperty(c => c.ConsumedByUserId, userId), ct);

        public Task<InviteCode?> GetByIdAsync(int id, CancellationToken ct = default) =>
            _context.InviteCodes.FirstOrDefaultAsync(c => c.Id == id, ct);

        public async Task<IReadOnlyList<InviteCode>> ListAsync(CancellationToken ct = default) =>
            await _context.InviteCodes
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync(ct);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
