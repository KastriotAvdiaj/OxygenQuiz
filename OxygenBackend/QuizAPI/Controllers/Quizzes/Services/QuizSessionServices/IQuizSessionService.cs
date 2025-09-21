using QuizAPI.Common;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public interface IQuizSessionService
    {
        // Live Quiz Flow
        Task<Result<QuizStateDto>> GetCurrentStateAsync(Guid sessionId);
        Task<Result<CurrentQuestionDto>> GetNextQuestionAsync(Guid sessionId);
        Task<Result<InstantFeedbackAnswerResultDto>> SubmitAnswerAsync(UserAnswerCM model);

        // Session Management
        Task<Result<QuizSessionDto>> CreateSessionAsync(QuizSessionCM model);
        Task<Result<QuizSessionDto>> GetSessionAsync(Guid sessionId);
        Task<Result<List<QuizSessionSummaryDto>>> GetUserSessionsAsync(Guid userId);
        Task<Result<QuizSessionDto>> CompleteSessionAsync(Guid sessionId);
        Task<Result<int>> CleanupAbandonedSessionsAsync();
        Task<Result> DeleteSessionAsync(Guid sessionId);

        Task<Result<QuizSessionDto>> AbandonAndCreateNewSessionAsync(Guid existingSessionId, QuizSessionCM model);
        Task<Result<QuizSessionDto>> ResumeSessionAsync(Guid sessionId, Guid userId);

        /// <summary>
        /// Gets the current grading status for a session (useful for non-instant feedback quizzes)
        /// </summary>
        Task<Result<SessionGradingStatus>> GetGradingStatusAsync(Guid sessionId);

        /// <summary>
        /// Waits for all answers to be graded or timeout after specified duration
        /// </summary>
        Task<Result<QuizSessionDto>> GetSessionWithGradedAnswersAsync(Guid sessionId, int maxWaitSeconds = 30);
    }

}   
