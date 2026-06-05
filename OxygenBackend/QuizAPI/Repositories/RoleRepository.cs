using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class RoleRepository : IRoleRepository
    {
        private readonly ApplicationDbContext _context;

        public RoleRepository(ApplicationDbContext context) => _context = context;

        public async Task<IReadOnlyList<Role>> GetByNamesAsync(IEnumerable<string> names, CancellationToken ct = default)
        {
            var lowered = names.Select(n => n.ToLowerInvariant()).ToList();
            return await _context.Roles
                .Where(r => lowered.Contains(r.Name.ToLower()))
                .ToListAsync(ct);
        }

        public async Task<Role?> GetByNameAsync(string name, CancellationToken ct = default)
    => await _context.Roles
        .AsNoTracking()
        .SingleOrDefaultAsync(r => r.Name == name, ct);
    }
}