using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// One-time token proving a user controls their email address, and therefore may set a new
    /// password. Deliberately a near-twin of <see cref="EmailVerificationToken"/> — same hashed
    /// storage, same single-use rule, same supersede-on-reissue — rather than a shared table with a
    /// "purpose" column: a bug that let one kind of token be redeemed as the other would turn
    /// "confirm your email" into "take over this account", and separate tables make that
    /// unrepresentable instead of merely unlikely.
    ///
    /// <para>Only the SHA-256 hash of the raw token is stored; the raw value exists in the email and
    /// nowhere else, so a database leak cannot be replayed into account takeover.</para>
    /// </summary>
    public class PasswordResetToken
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        [MaxLength(128)]
        public string TokenHash { get; set; } = string.Empty;

        /// <summary>
        /// One hour, against the verification token's twenty-four. This one hands over the account,
        /// so the window in which a forwarded or shoulder-surfed link is still live should be the
        /// smallest that survives a normal "check mail on your phone" round trip.
        /// </summary>
        public DateTime ExpiresAt { get; set; }

        public DateTime? ConsumedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public bool IsActive => ConsumedAt == null && ExpiresAt > DateTime.UtcNow;
    }
}
