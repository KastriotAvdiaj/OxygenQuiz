using QuizAPI.Models.Classroom;

namespace QuizAPI.Repositories.Interfaces
{
    public interface ITeacherAccessRequestRepository
    {
        Task AddAsync(TeacherAccessRequest request, CancellationToken ct = default);
        Task<TeacherAccessRequest?> GetByIdAsync(int id, bool tracked = false, CancellationToken ct = default);
        /// <summary>The user's most recent request, or null.</summary>
        Task<TeacherAccessRequest?> GetLatestForUserAsync(Guid userId, CancellationToken ct = default);
        /// <summary>Every request, pending first, then newest first; with the user loaded.</summary>
        Task<IReadOnlyList<TeacherAccessRequest>> ListAsync(TeacherAccessRequestStatus? status, CancellationToken ct = default);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
