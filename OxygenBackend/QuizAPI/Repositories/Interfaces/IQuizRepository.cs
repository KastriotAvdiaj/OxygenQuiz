using Microsoft.EntityFrameworkCore.Storage;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Data-access boundary for quizzes and their quiz-question join rows. Owns every EF query
    /// behind <c>QuizService</c>, including the existence checks the create/update flows validate
    /// against and the transaction the multi-step writes run inside.
    /// </summary>
    public interface IQuizRepository
    {
        /// <summary>No-tracking quiz query with the standard navigations (User / Category /
        /// Language / Difficulty / QuizQuestions) included, for filtering + mapping.
        /// When <paramref name="includeDeleted"/> is true the global soft-delete query filter is
        /// bypassed (admin-only), so soft-deleted quizzes are returned alongside live ones.</summary>
        IQueryable<Quiz> Query(bool includeDeleted = false);

        Task<Quiz?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<bool> ExistsAsync(int id, CancellationToken ct = default);

        /// <summary>The quiz's questions with full question detail, ordered by position.</summary>
        Task<List<QuizQuestion>> GetQuizQuestionsAsync(int quizId, CancellationToken ct = default);

        // ── Tracked reads for mutation ────────────────────────────────────────────
        Task<Quiz?> GetWithQuestionsForUpdateAsync(int id, CancellationToken ct = default);
        Task<Quiz?> GetTrackedAsync(int id, CancellationToken ct = default);

        // ── Validation helpers ────────────────────────────────────────────────────
        /// <summary>True only if the category, language and difficulty (and, when supplied, the
        /// user) all exist — the referential check the create/update flows enforce.</summary>
        Task<bool> ReferencedEntitiesExistAsync(
            int categoryId, int languageId, int difficultyId, Guid? userId = null, CancellationToken ct = default);

        /// <summary>True if every distinct id in <paramref name="questionIds"/> exists.</summary>
        Task<bool> AllQuestionsExistAsync(IReadOnlyCollection<int> questionIds, CancellationToken ct = default);

        // ── Writes ────────────────────────────────────────────────────────────────
        Task AddAsync(Quiz quiz, CancellationToken ct = default);
        Task AddQuizQuestionsAsync(IEnumerable<QuizQuestion> quizQuestions, CancellationToken ct = default);
        Task AddQuizQuestionAsync(QuizQuestion quizQuestion, CancellationToken ct = default);
        void RemoveQuizQuestions(IEnumerable<QuizQuestion> quizQuestions);
        void Remove(Quiz quiz);
        Task<int> SaveChangesAsync(CancellationToken ct = default);

        /// <summary>Begins a DB transaction for the multi-step create/update/delete flows.</summary>
        Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);
    }
}
