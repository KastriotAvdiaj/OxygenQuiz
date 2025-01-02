using System.Text.Json.Serialization;

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
            public string Text { get; set; } = string.Empty;
        public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();
        public DifficultyLevel Difficulty { get; set; } 

            public DateTime CreatedAt { get; set; }

            public Guid UserId { get; set; }

            [JsonIgnore]
            public User User { get; set; }
            public int CategoryId {  get; set; }

            [JsonIgnore]
            public QuestionCategory Category { get; set; }
        }
}
