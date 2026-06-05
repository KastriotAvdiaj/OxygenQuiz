using QuizAPI.Models;

namespace QuizAPI.Services.AuthenticationService
{
    public interface ITokenService
    {
        string GenerateToken(User user, IReadOnlyCollection<string> roleNames);
    }
}
