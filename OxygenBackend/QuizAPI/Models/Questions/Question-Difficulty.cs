using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models;

public class QuestionDifficulty
{
    public int ID { get; set; }

    public string Level { get; set; }

    public int? Weight  { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    public User User { get; set; } //CreatedBy

    public Guid UserId { get; set; }

    public ICollection<Question> Questions { get; set; }
}
