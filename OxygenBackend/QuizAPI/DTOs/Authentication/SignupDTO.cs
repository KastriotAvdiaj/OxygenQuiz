using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Authentication
{
    public class SignupDTO
    {
        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, MinLength(3), MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        // 12+ chars is the current minimum recommendation; complexity is handled by screening
        // against a common/breached-password blocklist rather than mandated character classes.
        [Required, MinLength(12), MaxLength(128), NotACommonPassword]
        public string Password { get; set; } = string.Empty;
    }
}
