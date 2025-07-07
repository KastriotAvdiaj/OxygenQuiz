using QuizAPI.DTOs.Question;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models
{
    public class QuestionCategory
    {
        public int Id { get; set; }

        public string Name { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; }//CreatedBy

        public DateTime CreatedAt { get; set; }

        public Guid UserId { get; set; }
        public ICollection<QuestionBase> Questions { get; set; }
        public string? ColorPaletteJson { get; set; }

    }
}
