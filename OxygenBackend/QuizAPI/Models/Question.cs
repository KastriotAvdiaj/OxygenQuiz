namespace QuizAPI.Models
{
    public enum DifficultyLevel
    {
        Easy,
        Medium,
        Hard
    }
        public class Question
        {
            public int Id { get; set; }
            public string Text { get; set; }
            public ICollection<AnswerOption> AnswerOptions { get; set; }
            public DifficultyLevel Difficulty { get; set; } 
        }
}
