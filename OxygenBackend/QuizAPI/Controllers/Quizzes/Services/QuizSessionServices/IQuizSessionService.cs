using QuizAPI.Common;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;
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

        // Guest play (see docs/auth/guest-play.md) — no account, no persistence beyond the live attempt.
        Task<Result<QuizSessionDto>> CreateGuestSessionAsync(int quizId);
        Task<bool> IsGuestSessionAsync(Guid sessionId);
        Task<Result> DiscardGuestSessionAsync(Guid sessionId);
        Task<Result<QuizSessionDto>> GetSessionAsync(Guid sessionId);

        /// <summary>
        /// Returns the owning UserId of a session, or null if the session doesn't exist.
        /// Used by the authenticated controller to enforce ownership (IDOR protection) without
        /// loading the whole session.
        /// </summary>
        Task<Guid?> GetSessionOwnerAsync(Guid sessionId);

        /// <summary>
        /// True when <paramref name="userId"/> played in the same match as <paramref name="sessionId"/>.
        /// The second ownership rule in this service, and the only one that is not "you own it":
        /// everyone in a match may read everyone's answers, permanently (ADR-less by design — it is
        /// argued in docs/quiz/multiplayer.md §7). It stays narrow on purpose: the
        /// match is the unit, so it grants nothing about a session outside it.
        /// </summary>
        Task<bool> IsMatchPeerAsync(Guid sessionId, Guid userId);

        /// <summary>
        /// The other players in this session's match, ordered as the final scoreboard was, each with
        /// the session id holding their answers. Empty for a single-player session — the caller
        /// renders no tabs rather than one.
        /// </summary>
        Task<Result<List<MatchPlayerDto>>> GetMatchPlayersAsync(Guid sessionId);

        /// <summary>
        /// Paginated play history (newest first), projected to summaries in SQL and excluding
        /// guest sessions. Powers the profile history list — see docs/quiz/user-stats-history.md.
        /// </summary>
        Task<Result<PagedResponse<QuizSessionSummaryDto>>> GetUserSessionsAsync(
            Guid userId,
            int page = 1,
            int pageSize = QuizSessionService.DefaultHistoryPageSize);
        Task<Result<QuizSessionDto>> CompleteSessionAsync(Guid sessionId);
        Task<Result<int>> CleanupAbandonedSessionsAsync();
        Task<Result> DeleteSessionAsync(Guid sessionId);

        Task<Result<QuizSessionDto>> AbandonAndCreateNewSessionAsync(Guid existingSessionId, QuizSessionCM model);
        Task<Result<QuizSessionDto>> ResumeSessionAsync(Guid sessionId, Guid userId);
        Task<Result<ResumeResultDto>> ResolveAndResumeAsync(Guid sessionId, Guid userId);

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
