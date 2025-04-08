using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using QuizAPI.DTOs.Question;

namespace QuizAPI.ManyToManyTables
{
    public class QuizQuestion
    {
        public int QuizId { get; set; }
        [ForeignKey(nameof(QuizId))]
        public Quiz Quiz { get; set; }

        //The score of THIS QUESTION within THIS quiz.
        public int Score { get; set; }
        public int QuestionId { get; set; }
        [ForeignKey(nameof(QuestionId))]
        public QuestionBase Question { get; set; }

    }

    public class QuizQuestionDTO
    {
        public int QuestionId { get; set; }
        public int QuizId { get; set; }

        public int Score { get; set; }
        public QuestionBaseDTO Question { get; set; } = new();
    }
}
