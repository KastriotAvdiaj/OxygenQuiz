using QuizAPI.DTOs.Question;
using QuizAPI.Filtering;
using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Data access for question categories.
    ///
    /// <para>This exists because the controller used to inject <c>ApplicationDbContext</c> and
    /// query it directly — which is a step past what CLAUDE.md forbids ("services never touch
    /// DbContext"): there was no service either. Categories, difficulties and languages were
    /// the only entities in the codebase without a repository.</para>
    ///
    /// <para><b>Search is a method here, not an <c>IQueryable</c> handed outward.</b> Returning
    /// a queryable would move EF back out into the caller and put the paging and the filter
    /// field whitelist somewhere a second call site could get wrong. The repository owns the
    /// whole read.</para>
    /// </summary>
    public interface IQuestionCategoryRepository
    {
        /// <summary>Every category, in the public shape. No creator username — see the DTO.</summary>
        Task<List<QuestionCategoryDTO>> GetAllAsync(CancellationToken ct = default);

        /// <summary>
        /// Filtered, sorted and paged, in the <b>admin</b> shape. Only role-gated callers should
        /// reach this: it carries the creator's username.
        /// </summary>
        Task<PagedResponse<QuestionCategoryAdminDTO>> SearchAsync(
            FilterQuery query, CancellationToken ct = default);

        /// <summary>Untracked read for responses.</summary>
        Task<QuestionCategoryDTO?> GetByIdAsync(int id, CancellationToken ct = default);

        /// <summary>Tracked read — the caller is about to mutate or delete the row.</summary>
        Task<QuestionCategory?> GetTrackedByIdAsync(int id, CancellationToken ct = default);

        /// <summary>
        /// Whether a category with this name already exists, ignoring case and surrounding
        /// whitespace. <paramref name="excludeId"/> lets an update skip its own row.
        ///
        /// <para>Duplicate names are not a cosmetic problem here: the AI generation flow resolves
        /// the model's suggested category by matching its name against this table
        /// (<c>use-ai-quiz-draft.tsx</c>), so two rows called "Science" make that resolution
        /// arbitrary.</para>
        /// </summary>
        Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken ct = default);

        Task AddAsync(QuestionCategory category, CancellationToken ct = default);

        void Remove(QuestionCategory category);

        Task SaveChangesAsync(CancellationToken ct = default);
    }
}
