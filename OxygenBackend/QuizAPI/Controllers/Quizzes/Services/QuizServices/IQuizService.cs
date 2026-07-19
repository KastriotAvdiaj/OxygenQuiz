using QuizAPI.DTOs.Quiz;
using QuizAPI.Filtering;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizServices
{
    public interface IQuizService
    {
        /// <summary>
        /// Get all quizzes with summary information
        /// </summary>
        /// <param name="includeInactive">Whether to include inactive quizzes</param>
        /// <returns>List of quiz summaries</returns>
        Task<PagedList<QuizSummaryDTO>> GetAllQuizzesAsync(QuizFilterParams filterParam);

        // Reference implementation of the shared filtering framework (operators + search +
        // sort + body-envelope pagination). See docs/quiz/filtering.md.
        Task<PagedResponse<QuizSummaryDTO>> SearchQuizzesAsync(
            FilterQuery query,
            Guid? restrictToUserId = null,
            bool publicOnly = false,
            bool includeDeleted = false,
            CancellationToken ct = default);

        /// <summary>
        /// Get quizzes created by a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="includeInactive">Whether to include inactive quizzes</param>
        /// <returns>List of quiz summaries</returns>
        Task<PagedList<QuizSummaryDTO>> GetQuizzesByUserAsync(Guid userId, QuizFilterParams filterParam);

        /// <summary>
        /// Get a quiz by its ID with detailed information.
        /// </summary>
        /// <param name="id">The quiz ID</param>
        /// <param name="currentUserId">
        /// When supplied and equal to the quiz owner, the returned DTO includes the Unlisted
        /// <c>ShareToken</c>; otherwise the token is omitted so it never leaks to other callers.
        /// </param>
        /// <returns>Detailed quiz information or null if not found</returns>
        Task<QuizDTO?> GetQuizByIdAsync(int id, Guid? currentUserId = null);

        /// <summary>
        /// Resolves an Unlisted quiz by its share token, bypassing discovery filters. The token is
        /// the access grant (see docs/quiz/quiz-visibility.md). Returns null for an unknown token or a
        /// Draft quiz.
        /// </summary>
        Task<QuizDTO?> GetQuizByShareTokenAsync(string shareToken);

        /// <summary>
        /// Get quiz questions with full question details
        /// </summary>
        /// <param name="id">The quiz ID</param>
        /// <returns>List of quiz questions with question details or null if quiz not found</returns>
        Task<List<QuizQuestionDTO>?> GetQuizQuestionsAsync(int id);

        /// <summary>
        /// Create a new quiz
        /// </summary>
        /// <param name="userId">ID of the user creating the quiz</param>
        /// <param name="quizCM">Quiz creation model</param>
        /// <returns>Created quiz</returns>
        Task<QuizDTO> CreateQuizAsync(Guid userId, QuizCM quizCM);

        /// <summary>
        /// Create a quiz and all of its questions in a single transaction (AI-assisted flow).
        /// Questions are created Private and inherit the quiz's category/language. If any step
        /// fails the whole import rolls back, so no orphan questions can be left behind.
        /// See docs/quiz/ai-quiz-architecture.md §7.
        /// </summary>
        Task<QuizDTO> CreateAiQuizAsync(Guid userId, AiQuizImportCM importCM);

        /// <summary>
        /// Update an existing quiz
        /// </summary>
        /// <param name="userId">ID of the user updating the quiz</param>
        /// <param name="quizUM">Quiz update model</param>
        /// <returns>Updated quiz or null if not found or user doesn't have permission</returns>
        Task<QuizDTO?> UpdateQuizAsync(Guid userId, QuizUM quizUM);

        /// <summary>
        /// Sets a quiz's status (Draft / Unlisted / Public). Owner-only.
        /// </summary>
        /// <param name="userId">ID of the user changing the status</param>
        /// <param name="quizId">ID of the quiz</param>
        /// <param name="status">The new status</param>
        /// <returns>Updated quiz or null if not found or user doesn't have permission</returns>
        Task<QuizDTO?> SetQuizStatusAsync(Guid userId, int quizId, QuizStatus status);

        /// <summary>
        /// Lazily generates (or returns the existing) share token for an owned quiz so the owner can
        /// build an Unlisted play link. Owner-only.
        /// </summary>
        /// <param name="userId">ID of the user requesting the link</param>
        /// <param name="quizId">ID of the quiz</param>
        /// <returns>The share token, or null if the quiz isn't found or the caller isn't the owner.</returns>
        Task<string?> GenerateShareTokenAsync(Guid userId, int quizId);

        /// <summary>
        /// Whether <paramref name="hostUserId"/> may host <paramref name="quizId"/> in a multiplayer
        /// lobby: true for a Public quiz or one the host owns (any status). Used to validate the
        /// host's quiz selection server-side. See docs/quiz/quiz-visibility.md.
        /// </summary>
        Task<bool> CanHostQuizAsync(int quizId, Guid hostUserId);

        /// <summary>
        /// Get all publicly available quizzes
        /// </summary>
        /// <returns>List of publicly available quiz summaries</returns>
        Task<PagedList<QuizSummaryDTO>> GetPublicQuizzesAsync(QuizFilterParams filterParams);

        /// <summary>
        /// Soft-delete a quiz (stamps DeletedAt; played sessions / answers are preserved).
        /// </summary>
        /// <param name="userId">ID of the user attempting to delete the quiz</param>
        /// <param name="quizId">ID of the quiz to delete</param>
        /// <param name="isAdmin">When true, the ownership check is bypassed so admins can delete any quiz.</param>
        /// <returns>True if deleted successfully, false if not found or user doesn't have permission</returns>
        Task<bool> DeleteQuizAsync(Guid userId, int quizId, bool isAdmin = false);
    }
}
