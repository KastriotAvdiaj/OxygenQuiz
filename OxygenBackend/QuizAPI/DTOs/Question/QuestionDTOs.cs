using QuizAPI.Models;

namespace QuizAPI.DTOs.Question
{
    // CM = Create Model, for creating the question
    public class QuestionCM
    {
        public string Text { get; set; } = string.Empty;
        public int DifficultyId { get; set; }

        public int CategoryId { get; set; }
        public List<AnswerOptionCM> AnswerOptions { get; set; }
    }

    // Used for sending the data - Transferring the model 
    public class QuestionDTO
    {
        public int ID { get; set; }
        public string Text { get; set; } = string.Empty;

        public string Difficulty { get; set; }

        public string Category { get; set; }

        public int TotalQuestions { get; set; }

        public List<AnswerOptionDTO> AnswerOptions { get; set; }

    }

    public class IndividualQuestionDTO {
    
        public int ID { get; set; }

        public string Text { get; set; } = string.Empty;

        public int DifficultyId { get; set; }
        public string Difficulty { get; set; }

        public int CategoryId { get; set; }

        public Guid UserId { get; set; }

        public DateTime CreatedAt { get; set; }

        public string User { get; set; }
        public string Category { get; set; }
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

}
