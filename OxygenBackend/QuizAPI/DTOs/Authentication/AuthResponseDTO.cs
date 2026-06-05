using QuizAPI.DTOs.User;

namespace QuizAPI.DTOs.Authentication
{
    public class AuthResponseDTO
    {
        public string Token { get; set; } = string.Empty;
        public UserDTO User { get; set; } = null!;
    }
}
