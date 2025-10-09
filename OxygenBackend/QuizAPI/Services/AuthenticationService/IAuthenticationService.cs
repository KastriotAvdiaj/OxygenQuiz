using QuizAPI.DTOs.User;

namespace QuizAPI.Services.AuthenticationService
{
    public interface IAuthenticationService
    {
        Task<AuthResult> SignupAsync(string email, string username, string password);
        Task<AuthResult> LoginAsync(string email, string password);
        Task<FullUserDTO> GetUserByIdAsync(Guid userId);
    }
}
