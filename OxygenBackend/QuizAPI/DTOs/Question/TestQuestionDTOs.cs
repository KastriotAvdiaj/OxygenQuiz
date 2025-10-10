using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Question
{
    public class TestQuestionRequest
    {
        [Required]
        public int QuestionId { get; set; }

        [Required]
        public QuestionType QuestionType { get; set; }

        [Required]
        [Range(5, 300)]
        public int TimeLimitInSeconds { get; set; }

        [Required]
        public PointSystem PointSystem { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public double TimeTaken { get; set; }

        public bool TimedOut { get; set; }

        // For Multiple Choice (single selection)
        public int? SelectedOptionId { get; set; }

        // For Multiple Choice (multiple selections)
        public List<int>? SelectedOptionIds { get; set; }

        // For True/False and Type Answer questions
        public string? Answer { get; set; }
    }

    public class TestQuestionResponse
    {
        public bool IsCorrect { get; set; }
        public int Score { get; set; }
        public string CorrectAnswer { get; set; } = string.Empty;
    }
}
