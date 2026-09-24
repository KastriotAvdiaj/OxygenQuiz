using QuizAPI.Models.Quiz;

namespace QuizAPI.Common
{
    /// <summary>
    /// Which quiz formats a caller may see at all. A format in <see cref="PreviewFormats"/> is
    /// being built and tested: it exists only for admins (Admin / SuperAdmin). For everyone else —
    /// signed-in players and guests — its quizzes are simply absent: not in the catalogue, search,
    /// "my quizzes", the lobby's picker, a read by id or a share link, and the authoring endpoints
    /// answer 404.
    ///
    /// <para><b>Releasing a format is removing it from <see cref="PreviewFormats"/></b> — one line,
    /// and every place below follows. That is why the rule lives here and not as a
    /// <c>Format == Classic</c> scattered through the reads.</para>
    ///
    /// <para>Enforced on the server. The frontend hides the matching buttons too, but that is
    /// affordance; this is the rule. See docs/quiz/associations.md, "Admins only, for now".</para>
    /// </summary>
    public static class QuizFormatAccess
    {
        /// <summary>Formats visible to admins only. Associations: added 2026-09-23, in testing.</summary>
        public static readonly QuizFormat[] PreviewFormats = { QuizFormat.Associations };

        public static bool IsAvailableTo(QuizFormat format, bool isAdmin) =>
            isAdmin || Array.IndexOf(PreviewFormats, format) < 0;

        /// <summary>The quizzes of formats this caller may see. Translates to SQL (<c>NOT … = ANY</c>).</summary>
        public static IQueryable<Quiz> VisibleTo(this IQueryable<Quiz> quizzes, bool isAdmin)
        {
            if (isAdmin) return quizzes;
            var preview = PreviewFormats;
            return quizzes.Where(q => !preview.Contains(q.Format));
        }
    }
}
