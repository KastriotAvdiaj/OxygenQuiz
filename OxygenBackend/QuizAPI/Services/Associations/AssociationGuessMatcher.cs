using QuizAPI.Services.Grading;

namespace QuizAPI.Services.Associations
{
    /// <summary>
    /// Whether a Guess matches a solution. Deliberately <b>not</b> a second implementation: it is
    /// <see cref="TypeTheAnswerMatcher.IsMatch"/> — the same normalisation typed answers get
    /// (spacing, diacritics so "ë"/"e" and "ç"/"c" match, punctuation, one leading article) —
    /// with the two author switches fixed:
    ///
    /// <list type="bullet">
    ///   <item><b>Case-insensitive.</b> Nobody expects capitals to matter on a board.</item>
    ///   <item><b>No partial match.</b> It would accept "the city of Rome" for "Rome", and a board's
    ///   whole point is the one exact linking word.</item>
    /// </list>
    ///
    /// Typo tolerance, if ever accepted (docs/proposals/typed-answer-typo-tolerance.md), arrives
    /// here through the shared core.
    /// </summary>
    public static class AssociationGuessMatcher
    {
        public static bool IsMatch(SolutionKey solution, string? guess) =>
            TypeTheAnswerMatcher.IsMatch(
                solution.Text,
                solution.Acceptable,
                caseSensitive: false,
                allowPartialMatch: false,
                submitted: guess);
    }
}
