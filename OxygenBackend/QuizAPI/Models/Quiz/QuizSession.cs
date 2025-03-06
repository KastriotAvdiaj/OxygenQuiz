using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models.Quiz
{
    public class QuizSession
    {
        [Key]
        public Guid Id { get; set; }
        public int QuizId { get; set; }
        public Guid UserId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int TotalScore { get; set; }
        public Quiz Quiz { get; set; } 
        public User User { get; set; }
        public ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();
    }
}
