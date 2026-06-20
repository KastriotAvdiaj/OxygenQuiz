using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Authentication
{
    public class VerifyEmailDTO
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }
}
