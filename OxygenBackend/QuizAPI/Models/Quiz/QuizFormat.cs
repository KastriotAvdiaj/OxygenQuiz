namespace QuizAPI.Models.Quiz
{
    /// <summary>
    /// Which kind of game a <see cref="Quiz"/> is played as. Fixed at creation — no update DTO
    /// carries it — because the content tables differ per format and a quiz cannot move between them.
    ///
    /// <para><b>Classic is 0</b> so every row that existed before formats backfills to it without a
    /// data migration, which is also the truth about those rows (the same trick as
    /// <see cref="QuizSessionMode"/>).</para>
    ///
    /// <para>Each format is its own vertical and shares only <see cref="Quiz"/> and the
    /// <see cref="QuizSession"/> header — see docs/adr/0018-quiz-formats-are-separate-verticals.md.
    /// Every Classic entry point refuses a non-Classic quiz through
    /// <see cref="Common.QuizFormatGuard"/>.</para>
    /// </summary>
    public enum QuizFormat
    {
        /// <summary>An ordered list of questions, each answered once. Everything before formats existed.</summary>
        Classic = 0,

        /// <summary>One Board of 4 Columns × 4 Tiles, a Column solution each and a Final solution. See docs/quiz/associations.md.</summary>
        Associations = 1,
    }
}
