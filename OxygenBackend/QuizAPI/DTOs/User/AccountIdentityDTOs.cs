using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.User
{
    public class RequestEmailChangeDTO
    {
        [Required, EmailAddress, MaxLength(256)]
        public string NewEmail { get; set; } = string.Empty;

        [Required, MaxLength(128)]
        public string CurrentPassword { get; set; } = string.Empty;
    }

    public class ConfirmEmailChangeDTO
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }

    public class ChangeUsernameDTO
    {
        // Same bounds as SignupDTO — a rename can't be a way around the signup rules.
        [Required, MinLength(3), MaxLength(50)]
        public string Username { get; set; } = string.Empty;
    }
}
