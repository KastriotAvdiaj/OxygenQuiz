using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Audit;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly ApplicationDbContext _context;

        public AuditLogRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(AuditLog log, CancellationToken ct = default) =>
            await _context.AuditLogs.AddAsync(log, ct);

        public IQueryable<AuditLog> Query() => _context.AuditLogs.AsNoTracking();

        public async Task<(IReadOnlyList<AuditLog> Items, int Total)> QueryAsync(AuditLogQuery query, CancellationToken ct = default)
        {
            var q = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (query.UserId is { } userId) q = q.Where(a => a.UserId == userId);
            if (!string.IsNullOrWhiteSpace(query.Entity)) q = q.Where(a => a.Entity == query.Entity);
            if (!string.IsNullOrWhiteSpace(query.Action)) q = q.Where(a => a.Action == query.Action);
            if (query.From is { } from) q = q.Where(a => a.CreatedAt >= from);
            if (query.To is { } to) q = q.Where(a => a.CreatedAt <= to);

            var total = await q.CountAsync(ct);

            var page = query.Page < 1 ? 1 : query.Page;
            var pageSize = Math.Clamp(query.PageSize, 1, 200);

            var items = await q
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return (items, total);
        }

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
