using QuizAPI.Filtering;
using QuizAPI.Models;
using static QuizAPI.Filtering.FilterOperator;

namespace QuizAPI.Controllers.Questions
{
    /// <summary>
    /// Whitelist of fields clients may filter / search / sort question categories by.
    /// See docs/quiz/filtering.md.
    /// </summary>
    public static class CategoryFilterFields
    {
        public static readonly FilterFieldSet<QuestionCategory> Fields = new FilterFieldSet<QuestionCategory>()
            .Field("name",      c => c.Name,      new[] { Contains, StartsWith, Eq }, searchable: true, sortable: true)
            .Field("userId",    c => c.UserId,    new[] { Eq, In })          // creator
            .Field("gradient",  c => c.Gradient,  new[] { Eq })
            .Field("createdAt", c => c.CreatedAt, new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true, defaultSort: true);
    }
}
