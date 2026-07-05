using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// A single-use signup invitation. Mirrors <see cref="EmailVerificationToken"/>: only the
    /// SHA-256 hash of the normalized code is stored (the raw value is shown once at generation),
    /// so a DB leak exposes no usable codes. Redeemed atomically during signup — see
    /// docs/auth/invite-code-system-plan.md.
    /// </summary>
    public class InviteCode
    {
        public int Id { get; set; }

        /// <summary>SHA-256 (hex) of the normalized code. Unique so it can be looked up directly.</summary>
        [MaxLength(128)]
        public string CodeHash { get; set; } = string.Empty;

        /// <summary>Optional admin note set at generation, e.g. "for Alban" or "batch 1".</summary>
        [MaxLength(256)]
        public string? Label { get; set; }

        public DateTime CreatedAt { get; set; }

        /// <summary>Null = never expires.</summary>
        public DateTime? ExpiresAt { get; set; }

        /// <summary>Null = still unused. Set the instant the code is consumed (the single-use marker).</summary>
        public DateTime? ConsumedAt { get; set; }

        /// <summary>The user who redeemed the code (audit: who used it). Null until consumed.</summary>
        public Guid? ConsumedByUserId { get; set; }

        /// <summary>Set when an admin revokes an unused code without it being redeemed.</summary>
        public DateTime? RevokedAt { get; set; }

        /// <summary>A code is redeemable only while unconsumed, unrevoked, and unexpired.</summary>
        public bool IsRedeemable =>
            ConsumedAt == null && RevokedAt == null && (ExpiresAt == null || ExpiresAt > DateTime.UtcNow);
    }
}
