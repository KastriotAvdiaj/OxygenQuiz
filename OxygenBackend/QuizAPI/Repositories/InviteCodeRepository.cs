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
                // The signup path reads GrantedRole off this entity to build the new user's roles.
                .Include(c => c.GrantedRole)
                .FirstOrDefaultAsync(c =>
                    c.CodeHash == codeHash &&
                    c.ConsumedAt == null &&
                    c.RevokedAt == null &&
                    (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow), ct);

        public Task<int> TryConsumeAsync(
            string codeHash, Guid userId, string normalizedEmail, CancellationToken ct = default) =>
            _context.InviteCodes
                .Where(c => c.CodeHash == codeHash
                         && c.ConsumedAt == null
                         && c.RevokedAt == null
                         && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow)
                         // The email binding is enforced HERE, in the same conditional UPDATE as the
                         // single-use guard, rather than only in the service's early check — so it
                         // can't be lost to a race any more than the cap can.
                         && (c.IntendedEmail == null || c.IntendedEmail == normalizedEmail))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.ConsumedAt, DateTime.UtcNow)
                    .SetProperty(c => c.ConsumedByUserId, userId), ct);

        public Task<InviteCode?> GetByIdAsync(int id, CancellationToken ct = default) =>
            _context.InviteCodes.FirstOrDefaultAsync(c => c.Id == id, ct);

        public async Task<IReadOnlyList<InviteCode>> ListAsync(CancellationToken ct = default) =>
            await _context.InviteCodes
                .Include(c => c.GrantedRole)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync(ct);

        public async Task<IReadOnlyDictionary<Guid, string>> GetConsumerUsernamesAsync(
            IEnumerable<Guid> userIds, CancellationToken ct = default)
        {
            var ids = userIds.Distinct().ToList();
            if (ids.Count == 0) return new Dictionary<Guid, string>();

            return await _context.Users
                .IgnoreQueryFilters() // show the consumer even if the account was later deleted
                .Where(u => ids.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Username, ct);
        }

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
