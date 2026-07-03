using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes
{
    /// <summary>
    /// "Variety" ordering for the quiz catalogue (see docs/quiz-discovery.md): interleaves
    /// categories so the first page shows the newest quiz of each category, then the second
    /// of each, and so on — new users immediately see the breadth of what the app offers
    /// instead of a wall of whatever category was published most recently.
    ///
    /// Not a real (whitelisted) sort field: <see cref="FilterEngine"/> can only ORDER BY a
    /// column, while this needs a per-category rank. The quiz search special-cases the
    /// pseudo sort field "variety" and calls <see cref="Apply"/> after filters/search.
    /// </summary>
    public static class QuizVarietyOrdering
    {
        /// <summary>The pseudo sort field clients send (e.g. <c>sort=variety:desc</c>).</summary>
        public const string SortField = "variety";

        /// <summary>True when the client's sort spec asks for variety ordering.</summary>
        public static bool IsRequested(string? sort) =>
            (sort ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(clause => clause.Split(':', 2)[0])
                .Any(field => field.Equals(SortField, StringComparison.OrdinalIgnoreCase));

        /// <summary>
        /// Orders by each quiz's recency rank WITHIN its category (0 = newest of its
        /// category), then by recency across the board. The rank is a correlated COUNT over
        /// the same (already filtered) source, so it translates to SQL and respects any
        /// active filters/search. Ties broken by Id for stable pagination.
        /// </summary>
        public static IOrderedQueryable<Quiz> Apply(IQueryable<Quiz> source) =>
            source
                .OrderBy(x => source.Count(y =>
                    y.CategoryId == x.CategoryId &&
                    (y.CreatedAt > x.CreatedAt ||
                     (y.CreatedAt == x.CreatedAt && y.Id > x.Id))))
                .ThenByDescending(x => x.CreatedAt)
                .ThenBy(x => x.Id);
    }
}
