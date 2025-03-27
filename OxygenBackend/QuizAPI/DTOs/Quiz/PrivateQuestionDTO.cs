using QuizAPI.DTOs.Question;

namespace QuizAPI.DTOs.Quiz
{
    public class PrivateQuestionDto
    {
        public int Id { get; set; }
        public string Text { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? DifficultyId { get; set; }
        public int? CategoryId { get; set; }
        public List<AnswerOptionDTO> AnswerOptions { get; set; }
    }

    public class PrivateQuestionCM
    {
        public string Text { get; set; }
        public List<AnswerOptionCM> AnswerOptions { get; set; }
        public int? DifficultyId { get; set; }
        public int? CategoryId { get; set; }
    }
}
