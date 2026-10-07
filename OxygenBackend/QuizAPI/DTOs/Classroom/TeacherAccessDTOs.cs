using System.ComponentModel.DataAnnotations;
using QuizAPI.Models.Classroom;

namespace QuizAPI.DTOs.Classroom
{
    public class RequestTeacherAccessDTO
    {
        [MaxLength(TeacherAccessRequest.MaxNoteLength)]
        public string? Note { get; set; }
    }

    public class DeclineTeacherAccessDTO
    {
        [MaxLength(TeacherAccessRequest.MaxReasonLength)]
        public string? Reason { get; set; }
    }

    /// <summary>The caller's own standing: whether they are a Teacher, their latest request, and when they may ask again.</summary>
    public class MyTeacherAccessDTO
    {
        public bool IsTeacher { get; set; }
        public TeacherAccessRequestDTO? Latest { get; set; }
        /// <summary>Null when a request may be made now (or the user is already a Teacher, or one is pending).</summary>
        public DateTime? CanRequestAgainAt { get; set; }
        public bool CanRequest { get; set; }
    }

    public class TeacherAccessRequestDTO
    {
        public int Id { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Note { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? DecidedAt { get; set; }
        public string? DeclineReason { get; set; }
    }
}
