using QuizAPI.Models.Quiz;
using QuizAPI.Services.Permissions;

namespace QuizAPI.Common
{
    /// <summary>
    /// Who puts a quiz in the picked catalogue without a moderator, and what takes it out again
    /// (docs/media/moderation.md, "Picked and community quizzes").
    ///
    /// <para><b>Two things, decided separately.</b> <i>House</i> (<c>IsHouse</c>) means staff made
    /// it — an Admin or SuperAdmin, a role check — and only drives the badge (a house quiz has
    /// none). <i>Auto-pick</i> is the <c>quiz:autopick</c> permission, so a SuperAdmin can hand it
    /// to a role of trusted creators without making them staff: their quizzes go straight into the
    /// picked catalogue, badged "Oxygen Pick".</para>
    /// </summary>
    public static class QuizHouse
    {
        /// <summary>A new quiz is picked at creation, and edits don't take it out of the catalogue.</summary>
        public const string AutoPickPermission = "quiz:autopick";

        /// <summary>
        /// Stamped once at creation: a later role change rewrites nothing. Staff are always
        /// picked, whatever the permission matrix says — a house quiz outside the catalogue would
        /// be neither half.
        /// </summary>
        public static void Stamp(Quiz quiz, bool creatorIsStaff, DateTime now, bool creatorCanAutoPick = false)
        {
            quiz.IsHouse = creatorIsStaff;
            if (creatorIsStaff || creatorCanAutoPick)
            {
                quiz.IsPicked = true;
                quiz.PickedAt = now;
            }
        }

        /// <summary>
        /// An edit to a picked quiz's content, by someone who couldn't have put it there
        /// themselves, takes it out of the picked catalogue: the edit may change the very thing it
        /// was picked for. A moderator picks it again. Call only when the content changed — a
        /// save that changes nothing, or only the status, keeps the pick. Returns whether it
        /// unpicked.
        /// </summary>
        public static bool UnpickForEdit(Quiz quiz, bool editorCanAutoPick)
        {
            if (!quiz.IsPicked || editorCanAutoPick) return false;
            quiz.IsPicked = false;
            quiz.PickedAt = null;
            return true;
        }

        /// <summary>
        /// Whether this caller may auto-pick: staff always; anyone else through
        /// <see cref="AutoPickPermission"/> (SuperAdmin passes every permission check). Without a
        /// permission service (some unit tests) only staff can.
        /// </summary>
        public static async Task<bool> CanAutoPickAsync(IPermissionService? permissions, Guid? userId, bool isStaff) =>
            isStaff
            || (permissions is not null && userId is { } id && await permissions.HasPermissionAsync(id, AutoPickPermission));
    }
}
