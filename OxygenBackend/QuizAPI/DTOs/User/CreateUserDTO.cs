using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.User
{

    // Used for creating a new User
    public class CreateUserDTO
    {
        [Required, StringLength(50, MinimumLength = 3)]
        public string Username { get; set; } = string.Empty;
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
        [Required, StringLength(100, MinimumLength = 8)]
        public string Password { get; set; } = string.Empty;
        public IReadOnlyList<string>? Roles { get; set; } // null/empty => default "user"
    }
}
