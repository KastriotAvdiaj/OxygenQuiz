using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Data access for question difficulties.
    ///
    /// <para>Same shape and same reasons as <see cref="IQuestionCategoryRepository"/>: the
    /// controller used to hold <c>ApplicationDbContext</c> itself. Two read methods rather than
    /// one, because the admin projection carries the creator's username and the public one must
    /// not — see <see cref="QuestionCategoryDTO"/>.</para>
    /// </summary>
    public interface IQuestionDifficultyRepository
    {
        Task<List<QuestionDifficultyDTO>> GetAllAsync(CancellationToken ct = default);

        /// <summary>Role-gated callers only: includes who created each row.</summary>
        Task<List<QuestionDifficultyAdminDTO>> GetAllForAdminAsync(CancellationToken ct = default);

        Task<QuestionDifficultyDTO?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<QuestionDifficulty?> GetTrackedByIdAsync(int id, CancellationToken ct = default);

        /// <summary>Case- and whitespace-insensitive duplicate check on <c>Level</c>.</summary>
        Task<bool> LevelExistsAsync(string level, int? excludeId = null, CancellationToken ct = default);

        Task AddAsync(QuestionDifficulty difficulty, CancellationToken ct = default);

        void Remove(QuestionDifficulty difficulty);

        Task SaveChangesAsync(CancellationToken ct = default);
    }

    /// <inheritdoc cref="IQuestionDifficultyRepository"/>
    public interface IQuestionLanguageRepository
    {
        Task<List<QuestionLanguageDTO>> GetAllAsync(CancellationToken ct = default);

        /// <summary>Role-gated callers only: includes who created each row.</summary>
        Task<List<QuestionLanguageAdminDTO>> GetAllForAdminAsync(CancellationToken ct = default);

        Task<QuestionLanguageDTO?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<QuestionLanguage?> GetTrackedByIdAsync(int id, CancellationToken ct = default);

        /// <summary>Case- and whitespace-insensitive duplicate check on <c>Language</c>.</summary>
        Task<bool> LanguageExistsAsync(string language, int? excludeId = null, CancellationToken ct = default);

        Task AddAsync(QuestionLanguage language, CancellationToken ct = default);

        void Remove(QuestionLanguage language);

        Task SaveChangesAsync(CancellationToken ct = default);
    }
}
