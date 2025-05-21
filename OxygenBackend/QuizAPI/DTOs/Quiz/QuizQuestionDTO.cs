using QuizAPI.DTOs.Question;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Quiz
{
    public class QuizQuestionDTO
    {
        public int QuizId { get; set; }
        public int QuestionId { get; set; }
        public int TimeLimitInSeconds { get; set; }
        public string PointSystem { get; set; } = string.Empty;

        public int OrderInQuiz { get; set; }

        public QuestionBaseDTO Question { get; set; } = new();
      
    }

    public class QuizQuestionCM
    {
        [Required]
        public int QuestionId { get; set; }

        [Range(0, 2000)]
        public int TimeLimitInSeconds { get; set; } = 10;

        [Required]
        public string PointSystem { get; set; } = "Standard";

        public int OrderInQuiz { get; set; }

    }


    //SAME AS THE CM BUT BETTER TO HAVE FOR CLARITY 
    public class QuizQuestionUM
    {
        [Required]
        public int QuestionId { get; set; }

        [Range(0, 2000)]
        public int TimeLimitInSeconds { get; set; } = 10;

        [Required]
        public string PointSystem { get; set; } = "Standard";

        public int OrderInQuiz { get; set; }

    }
}