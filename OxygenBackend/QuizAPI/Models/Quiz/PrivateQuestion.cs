using System.Text.Json.Serialization;

namespace QuizAPI.Models.Quiz
{
    public class PrivateQuestion
    {

        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;

        public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();

        public DateTime CreatedAt { get; set; }

        public Guid UserId { get; set; }

        [JsonIgnore]
        public User User { get; set; }

        public int? DifficultyId { get; set; } // if we do anything in the future

        [JsonIgnore]
        public QuestionDifficulty? Difficulty { get; set; }

        public int? CategoryId { get; set; } // if we do anything in the future

        [JsonIgnore]
        public QuestionCategory? Category { get; set; }
    }
}
