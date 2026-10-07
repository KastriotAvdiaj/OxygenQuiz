namespace QuizAPI.Services
{
    /// <summary>
    /// The "OxygenQuiz" account: the owner of the featured quizzes and their questions, so the quiz
    /// cards on the quiz home page read "by OxygenQuiz" rather than naming a person. Like
    /// <see cref="GuestAccount"/> it is a fixed, protected row (docs/adr/0011) that never logs in.
    /// Seeded by <see cref="FeaturedQuizzes.FeaturedQuizSeeder"/>; see docs/quiz/featured-quizzes.md.
    /// </summary>
    public static class SystemAccount
    {
        /// <summary>Fixed id so the row is the same well-known account in every environment.</summary>
        public static readonly Guid Id = Guid.Parse("00000000-0000-0000-0000-000000000002");

        public const string ImmutableName = "oxygenquiz";
        public const string Username = "OxygenQuiz";
        public const string Email = "system@oxygenquiz.internal";

        /// <summary>
        /// Used instead when someone already holds "oxygenquiz" — names share one namespace
        /// (ADR 0017), and a startup seeder must never fail on a name clash.
        /// </summary>
        public const string FallbackImmutableName = "oxygenquiz-official";
        public const string FallbackUsername = "OxygenQuiz-Official";
    }
}
