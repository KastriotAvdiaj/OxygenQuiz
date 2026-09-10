namespace QuizAPI.Common
{
    /// <summary>
    /// The seeded system-default lookup row — "Unspecified" — and the one place that decides
    /// whether a name is it.
    ///
    /// <para><b>Why by name.</b> <see cref="Services.DbSeeder"/> inserts one Unspecified row per
    /// lookup (category, difficulty, language), but nothing guarantees those rows land on the same
    /// ids in every environment: a database restored from a partial dump, or seeded after a manual
    /// insert, shifts them. So the rule is matched on the label, case-insensitively, exactly as
    /// <c>lookup-visibility.ts</c> matches it on the frontend.</para>
    ///
    /// <para><b>Why it lives here.</b> The same string was declared privately in
    /// <c>QuestionService</c> and again in <c>QuizService</c>, each documented as being "kept in
    /// sync" with the other — an arrangement that works right up until someone renames the seeded
    /// row and finds one of the two copies. The AI generation service needs the rule as well, and
    /// a third hand-synced copy is a drift waiting to happen, so all of them read it from here.
    /// The frontend counterpart cannot be shared across the process boundary; it is
    /// <c>UNSPECIFIED_LOOKUP_LABEL</c>, and the pairing is recorded in
    /// docs/quiz/quiz-question-classification.md.</para>
    /// </summary>
    public static class LookupDefaults
    {
        /// <summary>
        /// Display name of the seeded system default. Mirrors UNSPECIFIED_LOOKUP_LABEL in
        /// src/pages/Dashboard/Pages/Question/Entities/lookup-visibility.ts.
        /// </summary>
        public const string UnspecifiedName = "Unspecified";

        /// <summary>
        /// True when <paramref name="name"/> is the seeded "Unspecified" row. Null, empty and
        /// whitespace are false: an absent name is a different failure (the row doesn't exist)
        /// and callers report it differently.
        /// </summary>
        public static bool IsUnspecified(string? name) =>
            !string.IsNullOrWhiteSpace(name)
            && string.Equals(name.Trim(), UnspecifiedName, StringComparison.OrdinalIgnoreCase);
    }
}
