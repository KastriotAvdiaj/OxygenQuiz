using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>An in-app notification addressed to a single user.</summary>
    public class Notification
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }

        /// <summary>Category/kind, e.g. "info", "system", "quiz". Drives client rendering.</summary>
        [MaxLength(50)]
        public string Type { get; set; } = "info";

        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;

        public bool IsRead { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
