
using QuizAPI.Models;
using QuizAPI.Models.Statistics.Questions;
using System.Text.Json.Serialization;


namespace QuizAPI.Models
{
    public class Question
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();
        
        
        public DateTime CreatedAt { get; set; }

        public Guid UserId { get; set; }


        [JsonIgnore]
        public User User { get; set; }

        [JsonIgnore]
        public QuestionDifficulty Difficulty { get; set; }

        public int DifficultyId { get; set; }

        public string DifficultyLevel { get; set; }
        public int CategoryId { get; set; }

        [JsonIgnore]
        public QuestionCategory Category { get; set; }
    
        public QuestionStatistics? Statistics { get; set; }
}
}
