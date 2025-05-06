using QuizAPI.DTOs.Question;
using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Quiz
{
    public class QuizCM
    {
        [Required, MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public int CategoryId { get; set; } = 2042; // Default to "Unspecified" category

        [Required]
        public int LanguageId { get; set; } = 4;

        [Required]
        public int DifficultyId { get; set; } = 21;

        public int TimeLimitInSeconds { get; set; } = 5; 

        public bool ShowFeedBackImmediately { get; set; } = true;

        public bool ShuffleQuestions { get; set; } = false;
        /*public bool IsPublished { get; set; } = false;*/

        /*public bool IsActive { get; set; } = true;*/

        public List<ExistingQuestionWithScore> ExistingQuestions { get; set; } = new();
        public List<NewQuestionCMWithScore> NewQuestions { get; set; } = new();
    }

    public class ExistingQuestionWithScore
    {
        public int QuestionId { get; set; }
        public int Score { get; set; } 

        public int TimeLimitInSeconds { get; set; } = 10; // in seconds, 0 means no time limit
    }

    public class NewQuestionCMWithScore : QuestionBaseCM
    {

        public int TimeLimitInSeconds { get; set; } = 10; 
        public int Score { get; set; } 
    }

    public class QuizDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; }
        public string Language { get; set; }
        public bool IsPublished { get; set; }
        public DateTime CreatedAt { get; set; }
        public int NumberOfQuestions { get; set; }
    }

   

}
