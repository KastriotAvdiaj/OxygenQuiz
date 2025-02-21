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

        [Required, MaxLength(255)]
        public string Slug { get; set; } = string.Empty;

        [Required]
        public int CategoryId { get; set; }

        [Required]
        public int LanguageId { get; set; }

        public int? TimeLimit { get; set; } // in seconds

        public bool ShuffleQuestions { get; set; } = false;
        public bool ShuffleAnswers { get; set; } = false;
        public bool IsPublished { get; set; } = false;
        public int PassingScore { get; set; } = 50;

        // List of questions to add to the quiz.
        public List<QuizQuestionCM> Questions { get; set; } = new();
    }

    // Model for each quiz question during quiz creation.
    // Either an ExistingQuestionId must be provided (to add a global question)
    // OR a NewQuestion payload must be provided (to create a custom, private question).
    public class QuizQuestionCM
    {
        public int? ExistingQuestionId { get; set; }
        public NewQuestionCM? NewQuestion { get; set; }
        public int Order { get; set; } = 0;
    }

    // Model to create a new question (only for custom, private questions).
    public class NewQuestionCM
    {
        [Required, MaxLength(500)]
        public string Text { get; set; } = string.Empty;

        public List<NewAnswerOptionCM> AnswerOptions { get; set; } = new();

        [Required]
        public int DifficultyId { get; set; }

        [Required]
        public int CategoryId { get; set; }

        [Required]
        public int LanguageId { get; set; }
    }

    // Model for creating answer options for a new question.
    public class NewAnswerOptionCM
    {
        [Required]
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }


    public class QuizDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Slug { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public int LanguageId { get; set; }
        public int? TimeLimit { get; set; }
        public bool ShuffleQuestions { get; set; }
        public bool ShuffleAnswers { get; set; }
        public bool IsPublished { get; set; }
        public int PassingScore { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<QuizQuestionDTO> Questions { get; set; } = new();
    }

    public class QuizQuestionDTO
    {
        public int QuizQuestionId { get; set; }
        public int QuestionId { get; set; }
        public int Order { get; set; }
        public QuestionDTO Question { get; set; } = new();
    }

}
