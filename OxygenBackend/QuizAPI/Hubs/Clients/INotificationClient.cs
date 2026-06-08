using QuizAPI.DTOs.Notification;

namespace QuizAPI.Hubs.Clients
{
    /// <summary>Strongly-typed methods the server can invoke on a connected notification client.</summary>
    public interface INotificationClient
    {
        Task ReceiveNotification(NotificationDTO notification);
    }
}
