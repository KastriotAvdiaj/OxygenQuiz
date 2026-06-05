using QuizAPI.DTOs.Authentication;
using QuizAPI.DTOs.User;

namespace QuizAPI.Services.AuthenticationService
{
    public interface IAuthenticationService
    {
        Task<AuthResponseDTO> SignupAsync(SignupDTO dto, CancellationToken ct = default);
        Task<AuthResponseDTO> LoginAsync(LoginDTO dto, CancellationToken ct = default);
    }
}
