using QuizAPI.Filtering;
using QuizAPI.Models;
using static QuizAPI.Filtering.FilterOperator;

namespace QuizAPI.Controllers.Questions
{
    /// <summary>
    /// The whitelist of fields clients may filter / search / sort questions by. This is the
    /// single source of truth for what the question search endpoints accept — adding a new
    /// filterable field is a one-line change here, nothing else.
    /// </summary>
    public static class QuestionFilterFields
    {
        /// <summary>
        /// Field whitelist for any question entity. Generic over <typeparamref name="T"/> so the
        /// same definition serves the base list (<c>QuestionBase</c>) and the typed lists
        /// (<c>MultipleChoiceQuestion</c>, …) — every selector is an inherited member.
        /// </summary>
        public static FilterFieldSet<T> For<T>() where T : QuestionBase =>
            new FilterFieldSet<T>()
                .Field("text",         q => q.Text,         new[] { Contains, StartsWith, Eq }, searchable: true, sortable: true)
                .Field("categoryId",   q => q.CategoryId,   new[] { Eq, In })
                .Field("difficultyId", q => q.DifficultyId, new[] { Eq, In })
                .Field("languageId",   q => q.LanguageId,   new[] { Eq, In })
                .Field("visibility",   q => q.Visibility,   new[] { Eq, In })          // enum
                .Field("type",         q => q.Type,         new[] { Eq, In })          // enum
                .Field("userId",       q => q.UserId,       new[] { Eq })
                .Field("createdAt",    q => q.CreatedAt,    new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true, defaultSort: true);

        /// <summary>Base-question field set (used by GET /api/questions/search).</summary>
        public static readonly FilterFieldSet<QuestionBase> Fields = For<QuestionBase>();
    }
}
