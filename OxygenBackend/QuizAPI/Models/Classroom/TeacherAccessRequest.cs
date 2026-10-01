using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models.Classroom
{
    public enum TeacherAccessRequestStatus { Pending = 0, Approved = 1, Declined = 2 }

    /// <summary>
    /// A user asking for the Teacher role, and an Admin's answer (docs/auth/teacher-role.md §2).
    /// Kept after it is decided: the decline date is what the 30-day wait is counted from, and the
    /// row is the record of who approved whom.
    /// </summary>
    public class TeacherAccessRequest
    {
        public const int MaxNoteLength = 500;
        public const int MaxReasonLength = 500;

        public int Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        /// <summary>Optional — the school, the subject; whatever helps an Admin decide.</summary>
        [MaxLength(MaxNoteLength)]
        public string? Note { get; set; }

        public TeacherAccessRequestStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }

        public Guid? DecidedByUserId { get; set; }
        public DateTime? DecidedAt { get; set; }

        /// <summary>Optional, shown to the user with a decline.</summary>
        [MaxLength(MaxReasonLength)]
        public string? DeclineReason { get; set; }
    }
}
