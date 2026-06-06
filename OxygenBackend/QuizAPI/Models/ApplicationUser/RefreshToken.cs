using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// Persisted server-side record of an issued refresh token.
    /// Only the SHA-256 hash of the raw token is stored, so a DB leak can't be replayed.
    /// Manages active sessions: rotating on refresh and revoking on logout.
    /// </summary>
    public class RefreshToken
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        [MaxLength(128)]
        public string TokenHash { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public DateTime? RevokedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public bool IsActive => RevokedAt == null && ExpiresAt > DateTime.UtcNow;
    }
}
