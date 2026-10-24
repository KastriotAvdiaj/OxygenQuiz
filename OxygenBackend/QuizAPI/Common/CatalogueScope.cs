using QuizAPI.Models.Quiz;

namespace QuizAPI.Common
{
    /// <summary>
    /// Which part of the public catalogue a request wants (docs/media/moderation.md, "Picked and
    /// community quizzes"): <c>picked</c> — house quizzes and community quizzes an admin picked, the
    /// default catalogue and the landing page; <c>community</c> — every other Public quiz, behind the
    /// community switch; <c>all</c> or nothing — both, which is what the lobby picker, host setup and
    /// the other tools that predate the split keep getting.
    /// </summary>
    public static class CatalogueScope
    {
        public const string Picked = "picked";
        public const string Community = "community";

        public static IQueryable<Quiz> InCatalogueScope(this IQueryable<Quiz> quizzes, string? scope) =>
            scope?.Trim().ToLowerInvariant() switch
            {
                Picked => quizzes.Where(q => q.IsPicked),
                Community => quizzes.Where(q => !q.IsPicked),
                _ => quizzes,
            };
    }
}
