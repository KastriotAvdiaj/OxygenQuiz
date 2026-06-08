using QuizAPI.DTOs.Notification;

namespace QuizAPI.Controllers.Notifications.Services
{
    public interface INotificationService
    {
        /// <summary>Creates a notification for a user. Callable by other services for system events.</summary>
        Task<NotificationDTO> CreateAsync(Guid userId, string type, string title, string message, CancellationToken ct = default);

        Task<IReadOnlyList<NotificationDTO>> GetForUserAsync(Guid userId, bool unreadOnly = false, CancellationToken ct = default);
        Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);

        /// <summary>Marks one notification read. Throws NotFoundException if it isn't the user's.</summary>
        Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct = default);
        Task<int> MarkAllReadAsync(Guid userId, CancellationToken ct = default);

        /// <summary>Deletes one notification. Throws NotFoundException if it isn't the user's.</summary>
        Task DeleteAsync(Guid id, Guid userId, CancellationToken ct = default);
    }
}
