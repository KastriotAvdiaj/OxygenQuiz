
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Models.Statistics.Questions;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;


namespace QuizAPI.Models
{

    public enum QuestionVisibility
    {
        Global,   
        Private  
    }
    public class Question
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();
        
        public DateTime CreatedAt { get; set; }

        public Guid UserId { get; set; }

        [JsonIgnore]
        public User User { get; set; } //CreatedBy

        public int DifficultyId { get; set; }

        [JsonIgnore]
        public QuestionDifficulty Difficulty { get; set; }

        public int CategoryId { get; set; }

        [JsonIgnore]
        public QuestionCategory Category { get; set; }

        public int LanguageId { get; set; }

        [JsonIgnore]
        public QuestionLanguage Language { get; set; }

        public ICollection<UserAnswer> UserAnswers { get; set; }

        [Required]
        public QuestionVisibility Visibility { get; set; } = QuestionVisibility.Global;

        public QuestionStatistics? Statistics { get; set; }

        public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();

    }
}
