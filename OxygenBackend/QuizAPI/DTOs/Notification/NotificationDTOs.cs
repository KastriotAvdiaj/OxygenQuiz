using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Notification
{
    public class NotificationDTO
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; } = "info";
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Payload for creating a notification for a specific user (admin/system).</summary>
    public class CreateNotificationDTO
    {
        [Required]
        public Guid UserId { get; set; }

        [MaxLength(50)]
        public string Type { get; set; } = "info";

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;
    }
}
