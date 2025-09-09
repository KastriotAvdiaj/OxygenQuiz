using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public interface IQuizSessionService
    {
        // Live Quiz Flow
        Task<Result<QuizStateDto>> GetCurrentStateAsync(Guid sessionId);
        Task<Result<CurrentQuestionDto>> GetNextQuestionAsync(Guid sessionId);
        Task<Result<AnswerResultDto>> SubmitAnswerAsync(UserAnswerCM model);

        // Session Management
        Task<Result<QuizSessionDto>> CreateSessionAsync(QuizSessionCM model);
        Task<Result<QuizSessionDto>> GetSessionAsync(Guid sessionId);
        Task<Result<List<QuizSessionSummaryDto>>> GetUserSessionsAsync(Guid userId);
        Task<Result<QuizSessionDto>> CompleteSessionAsync(Guid sessionId);
        Task<Result<int>> CleanupAbandonedSessionsAsync();
        Task<Result> DeleteSessionAsync(Guid sessionId);

        Task<Result<QuizSessionDto>> AbandonAndCreateNewSessionAsync(Guid existingSessionId, QuizSessionCM model);
        Task<Result<QuizSessionDto>> ResumeSessionAsync(Guid sessionId, Guid userId);
    }

}   
