using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public interface IQuizSessionService
    {

        Task<Result<CurrentQuestionDto>> GetNextQuestionAsync(Guid sessionId);
        Task<Result<AnswerResultDto>> SubmitAnswerAsync(UserAnswerCM model);
        Task<Result<QuizSessionDto>> CreateSessionAsync(QuizSessionCM model);
        Task<Result<QuizSessionDto>> GetSessionAsync(Guid sessionId);
        Task<Result<List<QuizSessionSummaryDto>>> GetUserSessionsAsync(Guid userId);
        Task<Result<QuizSessionDto>> CompleteSessionAsync(Guid sessionId);
        Task<Result> DeleteSessionAsync(Guid sessionId);
    }

}   
