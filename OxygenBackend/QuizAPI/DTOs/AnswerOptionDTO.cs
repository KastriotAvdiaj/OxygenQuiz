using QuizAPI.Models;

namespace QuizAPI.DTOs
{
    // CM = Create Model, for creating the question
    public class QuestionCM
    {
        public string Text { get; set; } = string.Empty;
        public DifficultyLevel Difficulty { get; set; }

        public string Category { get; set; }
        public List<AnswerOptionCM> AnswerOptions { get; set; }
    }

    // Used for sending the data - Transferring the model 
    public class QuestionDTO
    {
        public int ID { get; set; }
        public string Text { get; set; } = string.Empty;

        public DifficultyLevel Difficulty { get; set; }
        public string DifficultyDisplay => Difficulty.ToDisplayString();
    
        public string Category {  get; set; }

        public List<AnswerOptionDTO> AnswerOptions { get; set; }

    }

    public class AnswerOptionCM
    {
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }

    public class AnswerOptionDTO
    {
        public int ID { get; set; }
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }

    public static class DifficultyLevelExtensions
    {
        public static string ToDisplayString(this DifficultyLevel level)
        {
            return level switch
            {
                DifficultyLevel.Easy => "Easy",
                DifficultyLevel.Medium => "Medium",
                DifficultyLevel.Hard => "Hard",
                _ => "Unknown"
            };
        }
    }

}
