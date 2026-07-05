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

        /// <summary>
        /// Looks up a live quiz by its share token, bypassing the discovery query filter so an
        /// Unlisted quiz is reachable (the token is the access grant). Soft-deleted quizzes are
        /// still excluded. Returns null when no live quiz carries the token.
        /// </summary>
        Task<Quiz?> GetByShareTokenAsync(string shareToken, CancellationToken ct = default);

        /// <summary>
        /// Fetches a live quiz by id with the discovery filter bypassed (Unlisted/Draft included),
        /// for authorization checks that must see the quiz regardless of the caller. Soft-deleted
        /// quizzes are excluded.
        /// </summary>
        Task<Quiz?> GetByIdUnfilteredAsync(int id, CancellationToken ct = default);

        /// <summary>The quiz's questions with full question detail, ordered by position.
        /// When <paramref name="ignoreFilters"/> is true the QuestionBase discovery filter is
        /// bypassed (used by the authorized multiplayer match running without a current user).</summary>
        Task<List<QuizQuestion>> GetQuizQuestionsAsync(int quizId, bool ignoreFilters = false, CancellationToken ct = default);

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
        // QuizQuestion rows are never hard-deleted — edits retire rows via RemovedInVersion
        // (docs/quiz/quiz-editing.md), so session/answer FKs stay valid forever.
        void Remove(Quiz quiz);
        Task<int> SaveChangesAsync(CancellationToken ct = default);

        /// <summary>Begins a DB transaction for the multi-step create/update/delete flows.</summary>
        Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);
    }
}
