using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Classroom;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class TeacherAccessRequestRepository : ITeacherAccessRequestRepository
    {
        private readonly ApplicationDbContext _context;

        public TeacherAccessRequestRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(TeacherAccessRequest request, CancellationToken ct = default) =>
            await _context.TeacherAccessRequests.AddAsync(request, ct);

        public Task<TeacherAccessRequest?> GetByIdAsync(int id, bool tracked = false, CancellationToken ct = default)
        {
            var q = _context.TeacherAccessRequests.Include(r => r.User).AsQueryable();
            if (!tracked) q = q.AsNoTracking();
            return q.FirstOrDefaultAsync(r => r.Id == id, ct);
        }

        public Task<TeacherAccessRequest?> GetLatestForUserAsync(Guid userId, CancellationToken ct = default) =>
            _context.TeacherAccessRequests.AsNoTracking()
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
                .FirstOrDefaultAsync(ct);

        public async Task<IReadOnlyList<TeacherAccessRequest>> ListAsync(TeacherAccessRequestStatus? status, CancellationToken ct = default)
        {
            var q = _context.TeacherAccessRequests.AsNoTracking().Include(r => r.User).AsQueryable();
            if (status is { } s) q = q.Where(r => r.Status == s);
            return await q
                .OrderBy(r => r.Status == TeacherAccessRequestStatus.Pending ? 0 : 1)
                .ThenByDescending(r => r.CreatedAt)
                .ToListAsync(ct);
        }

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
