using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IFileRepository
    {
        Task AddAsync(FileRecord file, CancellationToken ct = default);
        Task<FileRecord?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<IReadOnlyList<FileRecord>> GetByEntityAsync(string entity, string entityId, CancellationToken ct = default);
        void Remove(FileRecord file);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
