using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Authentication
{
    /// <summary>Body of POST /api/Authentication/external-login.</summary>
    public class ExternalLoginDTO
    {
        /// <summary>"google" or "microsoft" (case-insensitive; normalized server-side).</summary>
        [Required, MaxLength(32)]
        public string Provider { get; set; } = string.Empty;

        /// <summary>The raw ID token obtained by the SPA from the provider's JS library.</summary>
        [Required, MaxLength(8192)]
        public string IdToken { get; set; } = string.Empty;
    }

    /// <summary>Body of POST /api/Authentication/external-signup.</summary>
    public class ExternalSignupDTO
    {
        /// <summary>
        /// The short-lived signed ticket returned by external-login when no account matched.
        /// Carries the verified {provider, sub, email} so the client can't tamper with them
        /// between the two steps. See docs/auth/social-login-plan.md §2.6.
        /// </summary>
        [Required, MaxLength(8192)]
        public string SignupTicket { get; set; } = string.Empty;

        [Required, MinLength(3), MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        // Same contract as SignupDTO.InviteCode: optional at the DTO level; whether it's
        // required is enforced by the Signup:RequireInviteCode flag in the service.
        [MaxLength(64)]
        public string? InviteCode { get; set; }
    }

    /// <summary>
    /// Returned by external-login when the verified identity matches no local account:
    /// the client must complete signup (username + invite code while gated) using the ticket.
    /// </summary>
    public class ExternalSignupRequiredDTO
    {
        /// <summary>Discriminator so the frontend can tell this apart from an AuthResponseDTO.</summary>
        public bool RequiresSignup => true;

        public string SignupTicket { get; set; } = string.Empty;

        /// <summary>Email asserted by the provider — shown to the user, not trusted by the server.</summary>
        public string? Email { get; set; }

        /// <summary>Prefill for the username field, derived from the provider profile. Advisory only.</summary>
        public string? SuggestedUsername { get; set; }
    }

    /// <summary>
    /// Internal outcome of an external login attempt: exactly one branch is set.
    /// Either the identity resolved to a user (Auth — the controller sets the refresh cookie),
    /// or signup is required (SignupRequired — no cookie, no session yet).
    /// </summary>
    public class ExternalLoginOutcome
    {
        public AuthResult? Auth { get; init; }
        public ExternalSignupRequiredDTO? SignupRequired { get; init; }

        public static ExternalLoginOutcome LoggedIn(AuthResult auth) => new() { Auth = auth };
        public static ExternalLoginOutcome NeedsSignup(ExternalSignupRequiredDTO dto) =>
            new() { SignupRequired = dto };
    }
}
