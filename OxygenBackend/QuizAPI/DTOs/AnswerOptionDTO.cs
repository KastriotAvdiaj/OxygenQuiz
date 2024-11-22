using QuizAPI.Models;

namespace QuizAPI.DTOs
{
    public class QuestionDto
    {
        public string Text { get; set; } 
        public DifficultyLevel Difficulty { get; set; } 
        public List<AnswerOptionDTO> AnswerOptions { get; set; }
    }

    public class AnswerOptionDTO
    {
        public string Text { get; set; } 
        public bool IsCorrect { get; set; } 
    }
}
