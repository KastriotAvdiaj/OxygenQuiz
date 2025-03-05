using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.DTOs.Question
{
    // CM = Create Model, for creating the question
    public class QuestionCM
    {
        public string Text { get; set; } = string.Empty;
        public int DifficultyId { get; set; }

        public int LanguageId { get; set; }
        public int CategoryId { get; set; }
        public List<AnswerOptionCM> AnswerOptions { get; set; }
    }

    public class QuestionUM : QuestionCM
    {
        public QuestionVisibility Visibility { get; set; }
    }

    // Used for sending the data - Transferring the model 
        public class QuestionDTO
        {
            public int ID { get; set; }
            public string Text { get; set; } = string.Empty;

            public DifficultyDTO Difficulty { get; set; }

            public LangaugeDTO Language { get; set; }

            public UserBasicDTO User { get; set; }

            public CategoryDTO Category { get; set; }

            public int TotalQuestions { get; set; }

            public string Visibility { get; set; }

            public List<AnswerOptionDTO> AnswerOptions { get; set; }

        }

    public class CategoryDTO
    {
        public int Id { get; set; }

        public string Category { get; set; } = string.Empty;
    }

    public class DifficultyDTO
    {

       public int Id { get; set; }

        public string Level { get; set; } = string.Empty;

        public int Weight { get; set; }
    }

    public class LangaugeDTO {
    
    public int Id { get; set; }
    public string Langauge { get; set; } = string.Empty;
    }


    public class IndividualQuestionDTO {
    
            public int ID { get; set; }

            public string Text { get; set; } = string.Empty;

            public int DifficultyId { get; set; }
            public string Difficulty { get; set; }

            public int CategoryId { get; set; }

            public string Category { get; set; }

            public int LanguageId { get; set; }

            public string Language { get; set; }

            public string Visibility  { get; set; }

            public Guid UserId { get; set; }

            public DateTime CreatedAt { get; set; }

            public UserBasicDTO User { get; set; }
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
