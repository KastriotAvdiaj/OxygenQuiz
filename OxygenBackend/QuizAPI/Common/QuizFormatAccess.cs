using QuizAPI.Models.Quiz;

namespace QuizAPI.Common
{
    /// <summary>
    /// Which quiz formats a caller may see at all. A format in <see cref="PreviewFormats"/> is
    /// being built and tested: it exists only for admins (Admin / SuperAdmin) and Teachers, who host
    /// boards for a class (docs/auth/teacher-role.md). For everyone else —
    /// signed-in players and guests — its quizzes are simply absent: not in the catalogue, search,
    /// "my quizzes", the lobby's picker, a read by id or a share link, and the authoring endpoints
    /// answer 404.
    ///
    /// <para><b>Releasing a format is removing it from <see cref="PreviewFormats"/></b> — one line,
    /// and every place below follows. That is why the rule lives here and not as a
    /// <c>Format == Classic</c> scattered through the reads.</para>
    ///
    /// <para>Enforced on the server. The frontend hides the matching buttons too, but that is
    /// affordance; this is the rule. See docs/quiz/associations.md §0.</para>
    /// </summary>
    public static class QuizFormatAccess
    {
        /// <summary>
        /// Formats visible to admins and Teachers only. Empty today: Associations was here from
        /// 2026-09-23 and was released to every player on 2026-10-08 (docs/quiz/associations.md §0).
        /// The next format in testing goes here.
        /// </summary>
        public static readonly QuizFormat[] PreviewFormats = Array.Empty<QuizFormat>();

        /// <param name="canSeePreview">Admin, SuperAdmin or Teacher — <c>ICurrentUserService.CanSeePreviewFormats</c>.</param>
        public static bool IsAvailableTo(QuizFormat format, bool canSeePreview) =>
            canSeePreview || Array.IndexOf(PreviewFormats, format) < 0;

        /// <summary>The quizzes of formats this caller may see. Translates to SQL (<c>NOT … = ANY</c>).</summary>
        public static IQueryable<Quiz> VisibleTo(this IQueryable<Quiz> quizzes, bool canSeePreview)
        {
            if (canSeePreview) return quizzes;
            var preview = PreviewFormats;
            return quizzes.Where(q => !preview.Contains(q.Format));
        }
    }
}
