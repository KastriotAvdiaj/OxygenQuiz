using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public interface IUserAnswerService
    {
        Task<Result<UserAnswerDto>> SubmitAnswerAsync(UserAnswerCM model);
        Task<Result<List<UserAnswerDto>>> GetSessionAnswersAsync(Guid sessionId);
        Task<Result<UserAnswerDto>> UpdateAnswerAsync(int answerId, UserAnswerCM model);
        Task<Result> DeleteAnswerAsync(int answerId);
    }
}
