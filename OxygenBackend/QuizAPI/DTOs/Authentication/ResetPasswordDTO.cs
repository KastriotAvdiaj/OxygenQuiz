using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Authentication
{
    public class ResetPasswordDTO
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        // Same rules as SignupDTO, and deliberately the same attributes rather than a looser copy:
        // a reset path with a weaker policy than signup is a way to get a 6-character password onto
        // an account that was not allowed one at creation.
        [Required, MinPasswordLength, MaxLength(128), NotACommonPassword]
        public string NewPassword { get; set; } = string.Empty;
    }
}
