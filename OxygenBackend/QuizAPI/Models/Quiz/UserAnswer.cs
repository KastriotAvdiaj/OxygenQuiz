using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace QuizAPI.Models.Quiz
{
    public class UserAnswer
    {

            public int Id { get; set; }
            public Guid SessionId { get; set; }
            public int QuestionId { get; set; }
            public string SubmittedAnswer { get; set; }

        [ForeignKey(nameof(AnswerOption))]
        public int SelectedOptionId { get; set; }

        [JsonIgnore]
        public virtual AnswerOption AnswerOption{ get; set; }

        public bool IsCorrect { get; set; }
            public int Score { get; set; } 
            public QuizSession QuizSession { get; set; }
            public QuestionBase Question { get; set; }
        }
    
}
