using QuizAPI.Models.Quiz;

namespace QuizAPI.Common
{
    /// <summary>
    /// Who may start a play of a quiz — one rule for every format, so a Classic session and an
    /// Associations game can't disagree about it. See docs/quiz/quiz-visibility.md.
    /// </summary>
    public static class QuizPlayAccess
    {
        /// <summary>
        /// Public quizzes are open to all; the owner may always play (including their own Drafts);
        /// an Unlisted quiz additionally requires the matching share token.
        ///
        /// <para>This is visibility only. A format in preview is a separate check
        /// (<see cref="QuizFormatAccess"/>), made by the caller before this one.</para>
        /// </summary>
        public static bool IsPlayAuthorized(Quiz quiz, Guid userId, string? shareToken) =>
            quiz.Status == QuizStatus.Public
            || quiz.UserId == userId
            || (quiz.Status == QuizStatus.Unlisted
                && !string.IsNullOrEmpty(quiz.ShareToken)
                && string.Equals(quiz.ShareToken, shareToken, StringComparison.Ordinal));
    }
}
