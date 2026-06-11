using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Data-access boundary for questions. Owns every EF query touching the question tables so
    /// <c>QuestionService</c> can stay focused on mapping, validation and the filtering framework.
    ///
    /// Read methods return <b>no-tracking</b> graphs with the standard navigations
    /// (Difficulty / Category / Language / User, plus AnswerOptions for multiple-choice) already
    /// included, so callers can project or map without re-specifying includes. The <c>*ForUpdate</c>
    /// methods return <b>tracked</b> entities meant to be mutated and saved.
    /// </summary>
    public interface IQuestionRepository
    {
        // ── Composable read queries (no-tracking, standard includes) ──────────────
        // Exposed as IQueryable so the service can layer the shared FilterEngine, AutoMapper
        // ProjectTo and pagination on top — mirrors IUserRepository.Query().
        IQueryable<QuestionBase> Query();
        IQueryable<MultipleChoiceQuestion> QueryMultipleChoice();
        IQueryable<TrueFalseQuestion> QueryTrueFalse();
        IQueryable<TypeTheAnswerQuestion> QueryTypeTheAnswer();

        // ── Single-item reads (no-tracking, fully included) ───────────────────────
        Task<QuestionBase?> GetBaseByIdAsync(int id, CancellationToken ct = default);
        Task<MultipleChoiceQuestion?> GetMultipleChoiceByIdAsync(int id, CancellationToken ct = default);
        Task<TrueFalseQuestion?> GetTrueFalseByIdAsync(int id, CancellationToken ct = default);
        Task<TypeTheAnswerQuestion?> GetTypeTheAnswerByIdAsync(int id, CancellationToken ct = default);

        Task<Guid?> GetOwnerIdAsync(int id, CancellationToken ct = default);
        Task<bool> IsUsedInAnyQuizAsync(int id, CancellationToken ct = default);

        // ── Tracked reads for mutation ────────────────────────────────────────────
        // When ownerId is supplied the lookup is clamped to that owner (used to enforce
        // "you may only edit your own" without a separate query).
        Task<MultipleChoiceQuestion?> GetMultipleChoiceForUpdateAsync(int id, Guid? ownerId, CancellationToken ct = default);
        Task<TrueFalseQuestion?> GetTrueFalseForUpdateAsync(int id, Guid? ownerId, CancellationToken ct = default);
        Task<TypeTheAnswerQuestion?> GetTypeTheAnswerForUpdateAsync(int id, Guid? ownerId, CancellationToken ct = default);

        /// <summary>Tracked, no includes — used by delete after the ownership/usage checks.</summary>
        Task<QuestionBase?> GetTrackedByIdAsync(int id, CancellationToken ct = default);

        // ── Writes ────────────────────────────────────────────────────────────────
        Task AddMultipleChoiceAsync(MultipleChoiceQuestion question, CancellationToken ct = default);
        Task AddTrueFalseAsync(TrueFalseQuestion question, CancellationToken ct = default);
        Task AddTypeTheAnswerAsync(TypeTheAnswerQuestion question, CancellationToken ct = default);
        void Remove(QuestionBase question);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
