using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context) => _context = context;

        // Single place that defines how a "full" user is loaded.
        private IQueryable<User> WithRoles() =>
            _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role);

        // Auth paths (login, /me, refresh) also need each role's permissions
        // so the DTO can carry a flat permission list. Heavier, so it's only
        // used where the permissions are actually consumed.
        private IQueryable<User> WithRolesAndPermissions() =>
            _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission);

        public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default) =>
            await WithRoles().AsNoTracking().ToListAsync(ct);

        public IQueryable<User> Query() => WithRoles().AsNoTracking();

        public async Task<User?> GetByIdAsync(Guid id, bool tracked = false, CancellationToken ct = default)
        {
            var query = WithRolesAndPermissions();
            if (!tracked) query = query.AsNoTracking();
            return await query.FirstOrDefaultAsync(u => u.Id == id, ct);
        }

        public async Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default) =>
            await WithRoles().AsNoTracking()
                .FirstOrDefaultAsync(u => u.ImmutableName == username.ToLower(), ct);

        public async Task<User?> GetByEmailAsync(string email, bool tracked = false, CancellationToken ct = default)
        {
            var query = WithRolesAndPermissions();
            if (!tracked) query = query.AsNoTracking();
            return await query.SingleOrDefaultAsync(u => u.Email == email, ct);
        }

        public async Task<IReadOnlyList<User>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default) =>
            await WithRoles().AsNoTracking().Where(u => ids.Contains(u.Id)).ToListAsync(ct);

        public Task<bool> ExistsAsync(Guid id, CancellationToken ct = default) =>
            _context.Users.AnyAsync(u => u.Id == id, ct);

        public Task<bool> UsernameExistsAsync(string immutableName, CancellationToken ct = default) =>
            _context.Users.AnyAsync(u => u.ImmutableName == immutableName, ct);

        public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default) =>
            _context.Users.AnyAsync(u => u.Email == email, ct);

        public async Task AddAsync(User user, CancellationToken ct = default) =>
            await _context.Users.AddAsync(user, ct);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}