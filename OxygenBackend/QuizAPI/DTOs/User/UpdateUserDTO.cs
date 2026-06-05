using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.User
{
    public class UpdateUserDTO
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
        [Url]
        public string? ProfileImageUrl { get; set; }
    }
}
