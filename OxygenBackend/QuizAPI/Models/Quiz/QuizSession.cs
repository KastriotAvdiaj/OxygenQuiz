using QuizAPI.ManyToManyTables;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models.Quiz
{

    public enum AbandonmentReason
    {
        UserInitiated,      // User chose to abandon
        Timeout,           // Automatic abandonment due to inactivity
        SystemCleanup      // Background cleanup job
    }
    public class QuizSession
    {
        [Key]
        public Guid Id { get; set; }
        public int QuizId { get; set; }
        public Guid UserId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int TotalScore { get; set; }
        public bool IsCompleted { get; set; } = false;
        public int? CurrentQuizQuestionId { get; set; }
        public DateTime? CurrentQuestionStartTime { get; set; }

        [ForeignKey(nameof(QuizId))]
        public virtual Quiz Quiz { get; set; } = null!;
        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; } = null!;
        [ForeignKey(nameof(CurrentQuizQuestionId))]
        public virtual QuizQuestion? CurrentQuizQuestion { get; set; }
        public virtual ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();

        public AbandonmentReason? AbandonmentReason { get; set; }
        public DateTime? AbandonedAt { get; set; }
    }
}
