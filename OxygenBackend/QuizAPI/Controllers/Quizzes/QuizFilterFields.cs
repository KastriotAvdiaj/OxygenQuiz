using QuizAPI.Filtering;
using QuizAPI.Models.Quiz;
using static QuizAPI.Filtering.FilterOperator;

namespace QuizAPI.Controllers.Quizzes
{
    /// <summary>
    /// The whitelist of fields clients may filter / search / sort quizzes by — the single
    /// source of truth for what the quiz search endpoints accept. Adding a filterable field
    /// is a one-line change here. Mirrors <see cref="Questions.QuestionFilterFields"/>.
    /// </summary>
    public static class QuizFilterFields
    {
        public static readonly FilterFieldSet<Quiz> Fields = new FilterFieldSet<Quiz>()
            .Field("title",        q => q.Title,        new[] { Contains, StartsWith, Eq }, searchable: true, sortable: true)
            .Field("description",  q => q.Description,  new[] { Contains },                 searchable: true)
            .Field("categoryId",   q => q.CategoryId,   new[] { Eq, In })
            .Field("difficultyId", q => q.DifficultyId, new[] { Eq, In })
            .Field("languageId",   q => q.LanguageId,   new[] { Eq, In })
            .Field("status",       q => q.Status,       new[] { Eq, In })   // enum: Draft / Unlisted / Public
            .Field("userId",       q => q.UserId,       new[] { Eq, In })   // filter by one or more authors
            .Field("createdAt",    q => q.CreatedAt,    new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true, defaultSort: true);
    }
}
