using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// A pending change of a user's email address: the address they asked for, and the one-time
    /// token mailed to it. The swap happens only when the token is redeemed — proof that whoever
    /// asked also controls the new inbox — so until then <see cref="User.Email"/> is untouched and
    /// the account still recovers through the old address.
    ///
    /// <para>A third near-twin of <see cref="EmailVerificationToken"/> and
    /// <see cref="PasswordResetToken"/>, and a separate table for the same reason they are: a bug
    /// that let one kind of token be redeemed as another must be unrepresentable, not unlikely.
    /// This one moves the account's recovery address, which is as good as handing the account
    /// over. Only the SHA-256 hash of the token is stored. See
    /// docs/auth/account-identity-changes.md.</para>
    /// </summary>
    public class EmailChangeToken
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        /// <summary>The address the account will move to when this token is redeemed.</summary>
        [MaxLength(256)]
        public string NewEmail { get; set; } = string.Empty;

        [MaxLength(128)]
        public string TokenHash { get; set; } = string.Empty;

        /// <summary>One hour, like a reset link — this also hands over the account.</summary>
        public DateTime ExpiresAt { get; set; }

        public DateTime? ConsumedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public bool IsActive => ConsumedAt == null && ExpiresAt > DateTime.UtcNow;
    }
}
