using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService
{
    public interface IUserAnswerService
    {
        Task<Result<List<UserAnswerDto>>> GetSessionAnswersAsync(Guid sessionId);
        Task<Result> DeleteAnswerAsync(int answerId);
    }
}
