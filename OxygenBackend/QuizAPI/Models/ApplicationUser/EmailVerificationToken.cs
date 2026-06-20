using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// One-time token proving a user controls their email address. Mirrors <see cref="RefreshToken"/>:
    /// only the SHA-256 hash of the raw token is stored (the raw value is emailed once), so a DB leak
    /// can't be replayed. Single-use — consumed on verification, and superseded when a new one is
    /// issued (resend).
    /// </summary>
    public class EmailVerificationToken
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        [MaxLength(128)]
        public string TokenHash { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public DateTime? ConsumedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public bool IsActive => ConsumedAt == null && ExpiresAt > DateTime.UtcNow;
    }
}
