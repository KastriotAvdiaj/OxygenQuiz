using QuizAPI.DTOs.Audit;
using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog log, CancellationToken ct = default);

        /// <summary>Filtered, newest-first page of audit entries plus the total match count.</summary>
        Task<(IReadOnlyList<AuditLog> Items, int Total)> QueryAsync(AuditLogQuery query, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
