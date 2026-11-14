using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class AiGenerationJobRepository : IAiGenerationJobRepository
    {
        private readonly ApplicationDbContext _context;

        public AiGenerationJobRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(AiGenerationJob job, CancellationToken ct = default) =>
            await _context.AiGenerationJobs.AddAsync(job, ct);

        public Task<AiGenerationJob?> GetForUserAsync(Guid id, Guid userId, bool tracked = false, CancellationToken ct = default)
        {
            var q = _context.AiGenerationJobs.AsQueryable();
            if (!tracked) q = q.AsNoTracking();
            return q.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId, ct);
        }

        public Task<AiGenerationJob?> GetTrackedAsync(Guid id, CancellationToken ct = default) =>
            _context.AiGenerationJobs.FirstOrDefaultAsync(j => j.Id == id, ct);

        public Task<AiGenerationJob?> GetUncollectedAsync(Guid userId, DateTime sinceUtc, CancellationToken ct = default) =>
            _context.AiGenerationJobs.AsNoTracking()
                .Where(j => j.UserId == userId && j.SeenAt == null && j.CreatedAt >= sinceUtc)
                .OrderByDescending(j => j.CreatedAt)
                .FirstOrDefaultAsync(ct);

        public Task<AiGenerationJob?> GetUnfinishedAsync(Guid userId, DateTime sinceUtc, CancellationToken ct = default) =>
            _context.AiGenerationJobs.AsNoTracking()
                .Where(j => j.UserId == userId && j.CreatedAt >= sinceUtc
                            && (j.Status == AiGenerationJobStatus.Queued || j.Status == AiGenerationJobStatus.Running))
                .OrderByDescending(j => j.CreatedAt)
                .FirstOrDefaultAsync(ct);

        public Task<List<AiGenerationJob>> GetStaleUnfinishedAsync(DateTime cutoffUtc, CancellationToken ct = default) =>
            _context.AiGenerationJobs
                .Where(j => j.CreatedAt < cutoffUtc
                            && (j.Status == AiGenerationJobStatus.Queued || j.Status == AiGenerationJobStatus.Running))
                .ToListAsync(ct);

        public async Task<int> DeleteOlderThanAsync(DateTime cutoffUtc, CancellationToken ct = default)
        {
            var old = await _context.AiGenerationJobs.Where(j => j.CreatedAt < cutoffUtc).ToListAsync(ct);
            _context.AiGenerationJobs.RemoveRange(old);
            return old.Count;
        }

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
    }
}
