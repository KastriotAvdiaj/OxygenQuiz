using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// Links a local account to an external identity provider (Google, Microsoft).
    /// The key is the provider's permanent subject id (the ID token's <c>sub</c> claim) —
    /// never the email, which can change or be recycled. One user may link several
    /// providers; a given (provider, sub) pair links to exactly one user.
    /// See docs/auth/social-login-plan.md.
    /// </summary>
    public class ExternalLogin
    {
        public int Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        /// <summary>Normalized provider name: "google" or "microsoft".</summary>
        [MaxLength(32)]
        public string Provider { get; set; } = string.Empty;

        /// <summary>The provider's stable account id (the ID token's <c>sub</c> claim).</summary>
        [MaxLength(128)]
        public string ProviderSubjectId { get; set; } = string.Empty;

        /// <summary>
        /// Email as asserted by the provider at link time. Audit/debug only — lookups after
        /// linking always go through (Provider, ProviderSubjectId).
        /// </summary>
        [MaxLength(256)]
        public string? Email { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
