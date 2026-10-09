using QuizAPI.Models.Classroom;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Classes, always clamped to their owner: every read and write takes the Teacher's id, so a
    /// Teacher can't reach another's Class by guessing ids (CLAUDE.md: ownership in the repository).
    /// </summary>
    public interface IClassRepository
    {
        Task<IReadOnlyList<Class>> ListAsync(Guid ownerId, CancellationToken ct = default);
        Task<Class?> GetAsync(int id, Guid ownerId, bool tracked = false, CancellationToken ct = default);
        Task<bool> NameTakenAsync(Guid ownerId, string name, int? exceptId, CancellationToken ct = default);
        Task AddAsync(Class @class, CancellationToken ct = default);
        /// <summary>How many Classes the host keeps — what the plan's class limit counts.</summary>
        Task<int> CountAsync(Guid ownerId, CancellationToken ct = default);
        void Remove(Class @class);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
