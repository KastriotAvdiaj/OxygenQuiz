using QuizAPI.DTOs.Quiz;
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

        /// <summary>
        /// Get quizzes created by a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <param name="includeInactive">Whether to include inactive quizzes</param>
        /// <returns>List of quiz summaries</returns>
        Task<PagedList<QuizSummaryDTO>> GetQuizzesByUserAsync(Guid userId, QuizFilterParams filterParam);

        /// <summary>
        /// Get a quiz by its ID with detailed information including questions
        /// </summary>
        /// <param name="id">The quiz ID</param>
        /// <returns>Detailed quiz information or null if not found</returns>
        Task<QuizDTO?> GetQuizByIdAsync(int id);

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
        /// Update an existing quiz
        /// </summary>
        /// <param name="userId">ID of the user updating the quiz</param>
        /// <param name="quizUM">Quiz update model</param>
        /// <returns>Updated quiz or null if not found or user doesn't have permission</returns>
        Task<QuizDTO?> UpdateQuizAsync(Guid userId, QuizUM quizUM);

        /// <summary>
        /// Toggle quiz publish status (published/unpublished)
        /// </summary>
        /// <param name="userId">ID of the user toggling the status</param>
        /// <param name="quizId">ID of the quiz</param>
        /// <returns>Updated quiz or null if not found or user doesn't have permission</returns>
        Task<QuizDTO?> ToggleQuizPublishStatusAsync(Guid userId, int quizId);

        /// <summary>
        /// Toggle quiz active status (active/inactive)
        /// </summary>
        /// <param name="userId">ID of the user toggling the status</param>
        /// <param name="quizId">ID of the quiz</param>
        /// <returns>Updated quiz or null if not found or user doesn't have permission</returns>
        Task<QuizDTO?> ToggleQuizActiveStatusAsync(Guid userId, int quizId);

        /// <summary>
        /// Get all publicly available quizzes
        /// </summary>
        /// <returns>List of publicly available quiz summaries</returns>
        Task<PagedList<QuizSummaryDTO>> GetPublicQuizzesAsync(QuizFilterParams filterParams);

        /// <summary>
        /// Delete a quiz and all its associated quiz-question relationships
        /// </summary>
        /// <param name="userId">ID of the user attempting to delete the quiz</param>
        /// <param name="quizId">ID of the quiz to delete</param>
        /// <returns>True if deleted successfully, false if not found or user doesn't have permission</returns>
        Task<bool> DeleteQuizAsync(Guid userId, int quizId);
    }
}
