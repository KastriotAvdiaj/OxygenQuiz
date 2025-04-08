using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models
{
    public class QuestionLanguage
    {
        public int Id { get; set; }
        public string Language { get; set; }

        public DateTime CreatedAt { get; set; }

        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } //CreatedBy

        public ICollection<QuestionBase> Questions { get; set; }
    }
}
