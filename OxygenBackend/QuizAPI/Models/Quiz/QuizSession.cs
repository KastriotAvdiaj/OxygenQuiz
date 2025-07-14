using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models.Quiz
{
    public class QuizSession
    {
        [Key]
        public Guid Id { get; set; }

        public int QuizId { get; set; } // Foreign key for Quiz 
        public Guid UserId { get; set; } // Foreign key for User

        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int TotalScore { get; set; }

        // --- Navigation Properties ---

        [ForeignKey(nameof(QuizId))]
        public virtual Quiz Quiz { get; set; } = null!;

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; } = null!;

        public virtual ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();
    }
}
