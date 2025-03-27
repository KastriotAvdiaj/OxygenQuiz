using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.ManyToManyTables
{
    public class QuizPrivateQuestion
    {
        public int QuizId { get; set; }
        [ForeignKey(nameof(QuizId))]
        public Quiz Quiz { get; set; }

        // The score for this private question within the quiz.
        public int Score { get; set; }

        public int PrivateQuestionId { get; set; }
        [ForeignKey(nameof(PrivateQuestionId))]
        public PrivateQuestion PrivateQuestion { get; set; }
    }

    public class QuizPrivateQuestionDTO
    {
        public int PrivateQuestionId { get; set; }
        public int QuizId { get; set; }
        public int Score { get; set; }
        public PrivateQuestionDto PrivateQuestion { get; set; }
    }
}
