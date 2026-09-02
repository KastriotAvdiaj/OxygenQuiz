using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Authentication
{
    public class SignupDTO
    {
        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, MinLength(3), MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        // Length comes from Auth:MinPasswordLength (8 in production, relaxed in development);
        // complexity is handled by screening against a common/breached-password blocklist rather
        // than mandated character classes, which is the pairing NIST SP 800-63B recommends.
        [Required, MinPasswordLength, MaxLength(128), NotACommonPassword]
        public string Password { get; set; } = string.Empty;

        // Optional at the DTO level so the same DTO works in both invite-only and open modes;
        // whether a code is *required* is enforced in AuthenticationService based on the
        // Signup:RequireInviteCode flag. See docs/auth/invite-code-system-plan.md.
        [MaxLength(64)]
        public string? InviteCode { get; set; }
    }
}
