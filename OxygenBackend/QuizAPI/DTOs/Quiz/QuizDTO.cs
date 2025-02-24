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

        /*[Required, MaxLength(255)]
        public string Slug { get; set; } = string.Empty;*/

        [Required]
        public int CategoryId { get; set; }

        [Required]
        public int LanguageId { get; set; }

        public int? TimeLimit { get; set; } // in seconds

        public bool ShuffleQuestions { get; set; } = false;
        public bool ShuffleAnswers { get; set; } = false;
        public bool IsPublished { get; set; } = false;
        public int PassingScore { get; set; } = 50;

        public List<PublicQuestionWithScore> PublicQuestionIds { get; set; } = new();
        public List<QuestionCMWithScore> PrivateQuestions { get; set; } = new();
    }

    public class PublicQuestionWithScore
    {
        public int QuestionId { get; set; }
        public int Score { get; set; } 
    }

    public class QuestionCMWithScore : QuestionCM
    {
        public int Score { get; set; } 
    }

    public class QuizDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
 /*       public string Slug { get; set; } = string.Empty;*/
        public string Category { get; set; }
        public string Language { get; set; }
        public int? TimeLimit { get; set; }
        public bool IsPublished { get; set; }
        public int PassingScore { get; set; }
        public DateTime CreatedAt { get; set; }
        public int NumberOfQuestions { get; set; }
    }

    public class QuizQuestionDTO
    {
        public int QuestionId { get; set; }
        public int QuizId { get; set; }

        public int Score { get; set; }
        public QuestionDTO Question { get; set; } = new();
    }

}
