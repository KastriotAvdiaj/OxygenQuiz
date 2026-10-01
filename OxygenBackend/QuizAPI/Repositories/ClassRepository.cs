using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Classroom;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class ClassRepository : IClassRepository
    {
        private readonly ApplicationDbContext _context;

        public ClassRepository(ApplicationDbContext context) => _context = context;

        public async Task<IReadOnlyList<Class>> ListAsync(Guid ownerId, CancellationToken ct = default) =>
            await _context.Classes.AsNoTracking()
                .Include(c => c.Students)
                .Where(c => c.OwnerUserId == ownerId)
                .OrderBy(c => c.Name)
                .ToListAsync(ct);

        public Task<Class?> GetAsync(int id, Guid ownerId, bool tracked = false, CancellationToken ct = default)
        {
            var q = _context.Classes.Include(c => c.Students).AsQueryable();
            if (!tracked) q = q.AsNoTracking();
            return q.FirstOrDefaultAsync(c => c.Id == id && c.OwnerUserId == ownerId, ct);
        }

        public Task<bool> NameTakenAsync(Guid ownerId, string name, int? exceptId, CancellationToken ct = default)
        {
            var lower = name.ToLower();
            return _context.Classes.AnyAsync(
                c => c.OwnerUserId == ownerId && c.Name.ToLower() == lower && (exceptId == null || c.Id != exceptId), ct);
        }

        public async Task AddAsync(Class @class, CancellationToken ct = default) => await _context.Classes.AddAsync(@class, ct);

        public void Remove(Class @class) => _context.Classes.Remove(@class);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
