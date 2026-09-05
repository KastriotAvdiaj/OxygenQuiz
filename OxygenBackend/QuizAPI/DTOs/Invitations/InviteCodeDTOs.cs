using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Invitations
{
    /// <summary>Request to mint a batch of invite codes.</summary>
    public class GenerateInviteCodesDTO
    {
        // Capped so a typo (or abuse) can't mint an unbounded batch. Role-granting codes are capped
        // harder still — to exactly 1 — by InviteCodeService.
        [Range(1, 200)]
        public int Count { get; set; } = 1;

        [MaxLength(256)]
        public string? Label { get; set; }

        /// <summary>Optional expiry (UTC). Null = codes never expire — but a role-granting code
        /// must set one.</summary>
        public DateTime? ExpiresAt { get; set; }

        /// <summary>
        /// Role the redeemed account gets on top of "User". Null or "User" = a plain invite.
        /// Naming a privileged role turns on the elevated-code rails (see InviteCodeService).
        /// </summary>
        [MaxLength(64)]
        public string? Role { get; set; }

        /// <summary>
        /// Bind the code to one address: only a signup with this email can redeem it. Required when
        /// <see cref="Role"/> names anything above "User".
        /// </summary>
        [MaxLength(256)]
        [EmailAddress]
        public string? IntendedEmail { get; set; }
    }

    /// <summary>
    /// Response to generation — the ONLY time plaintext codes leave the server. The admin must
    /// save/distribute them now; afterwards only status (see <see cref="InviteCodeStatusDTO"/>) is
    /// readable, since the DB stores hashes.
    /// </summary>
    public class GeneratedInviteCodesDTO
    {
        public List<string> Codes { get; set; } = new();
    }

    /// <summary>Admin status row — never includes plaintext.</summary>
    public class InviteCodeStatusDTO
    {
        public int Id { get; set; }
        public string? Label { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public DateTime? ConsumedAt { get; set; }
        public Guid? ConsumedByUserId { get; set; }
        public string? ConsumedByUsername { get; set; }
        public DateTime? RevokedAt { get; set; }

        /// <summary>Role this code grants on redemption. Null = plain invite ("User" only).</summary>
        public string? GrantedRole { get; set; }

        /// <summary>Address the code is bound to, if any.</summary>
        public string? IntendedEmail { get; set; }

        /// <summary>Convenience flag for the UI: still usable right now.</summary>
        public bool IsRedeemable { get; set; }
    }
}
