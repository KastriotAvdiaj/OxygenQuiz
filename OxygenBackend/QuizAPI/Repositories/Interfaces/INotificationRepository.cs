using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface INotificationRepository
    {
        Task AddAsync(Notification notification, CancellationToken ct = default);
        Task<Notification?> GetByIdAsync(Guid id, bool tracked = false, CancellationToken ct = default);
        Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId, bool unreadOnly, CancellationToken ct = default);
        Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);
        Task<int> MarkAllReadAsync(Guid userId, CancellationToken ct = default);
        void Remove(Notification notification);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
