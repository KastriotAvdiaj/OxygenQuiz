namespace QuizAPI.Models;

public class QuestionDifficulty
{
    public int ID { get; set; }

    public string Level { get; set; }

    public int? Weight  { get; set; }

    public ICollection<Question> Questions { get; set; }
}
