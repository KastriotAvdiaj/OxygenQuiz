
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

    public enum QuestionType
    {
        MultipleChoice,
        TrueFalse,
        TypeTheAnswer,
    }

    public abstract class QuestionBase
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;

        public string? ImageUrl { get; set; }

        [Required]
        public QuestionVisibility Visibility { get; set; } = QuestionVisibility.Global;

        public int DifficultyId { get; set; }
        [JsonIgnore]
        public QuestionDifficulty Difficulty { get; set; }

        public int CategoryId { get; set; }
        [JsonIgnore]
        public QuestionCategory Category { get; set; }

        public int LanguageId { get; set; }
        [JsonIgnore]
        public QuestionLanguage Language { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Guid UserId { get; set; }
        [JsonIgnore]
        public User User { get; set; }

        public QuestionStatistics? Statistics { get; set; }

        [Required]
        public QuestionType Type { get; set; }

        public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();

    }

    public class MultipleChoiceQuestion : QuestionBase
    {
        public MultipleChoiceQuestion()
        {
            Type = QuestionType.MultipleChoice;
        }

        public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();

        public bool AllowMultipleSelections { get; set; } = false;
    }

    public class TrueFalseQuestion : QuestionBase
    {
        public TrueFalseQuestion()
        {
            Type = QuestionType.TrueFalse;
        }
        public bool CorrectAnswer { get; set; }
    }

    public class TypeTheAnswerQuestion : QuestionBase
    {
        public TypeTheAnswerQuestion()
        {
            Type = QuestionType.TypeTheAnswer;
        }

        public string CorrectAnswer { get; set; } = string.Empty;

        public bool IsCaseSensitive { get; set; } = false;

        public bool AllowPartialMatch { get; set; } = false;

        public List<string> AcceptableAnswers { get; set; } = new List<string>();
    }

}
