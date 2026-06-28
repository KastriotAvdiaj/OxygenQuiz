using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Invitations
{
    /// <summary>Request to mint a batch of invite codes.</summary>
    public class GenerateInviteCodesDTO
    {
        // Capped so a typo (or abuse) can't mint an unbounded batch.
        [Range(1, 200)]
        public int Count { get; set; } = 1;

        [MaxLength(256)]
        public string? Label { get; set; }

        /// <summary>Optional expiry (UTC). Null = codes never expire.</summary>
        public DateTime? ExpiresAt { get; set; }
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

        /// <summary>Convenience flag for the UI: still usable right now.</summary>
        public bool IsRedeemable { get; set; }
    }
}
