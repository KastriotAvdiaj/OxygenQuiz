using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public interface IUserAnswerService
    {
        Task<Result<List<UserAnswerDto>>> GetSessionAnswersAsync(Guid sessionId);
        Task<Result> DeleteAnswerAsync(int answerId);
    }
}
