using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using QuizAPI.DTOs.Question;

namespace QuizAPI.ManyToManyTables
{

    public enum PointSystem
    {
        Standard,
        Double,
        Quadruple,
    }

    public class QuizQuestion
    {
        public int QuizId { get; set; }
        [ForeignKey(nameof(QuizId))]
        public Quiz Quiz { get; set; }

        public int TimeLimitInSeconds { get; set; } = 10;

        public PointSystem PointSystem { get; set; } = PointSystem.Standard;

        public int QuestionId { get; set; }
        [ForeignKey(nameof(QuestionId))]
        public QuestionBase Question { get; set; }

    }

    public class QuizQuestionDTO
    {
        public int QuestionId { get; set; }
        public int QuizId { get; set; }

        public PointSystem PointSystem { get; set; } = PointSystem.Standard;

        public int TimeLimitInSeconds { get; set; }
        public int Score { get; set; }
        public QuestionBaseDTO Question { get; set; } = new();
    }
}
