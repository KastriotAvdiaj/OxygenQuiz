using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class FileRepository : IFileRepository
    {
        private readonly ApplicationDbContext _context;

        public FileRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(FileRecord file, CancellationToken ct = default) =>
            await _context.Files.AddAsync(file, ct);

        public Task<FileRecord?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            _context.Files.FirstOrDefaultAsync(f => f.Id == id, ct);

        public async Task<IReadOnlyList<FileRecord>> GetByEntityAsync(string entity, string entityId, CancellationToken ct = default) =>
            await _context.Files
                .AsNoTracking()
                .Where(f => f.Entity == entity && f.EntityId == entityId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync(ct);

        public void Remove(FileRecord file) => _context.Files.Remove(file);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
