using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
using QuizAPI.ManyToManyTables;

namespace QuizAPI.Models.Quiz
{
    /// <summary>
    /// Represents a user's submitted answer to a specific question within a quiz session.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum AnswerStatus
    {
        NotAnswered,
        Correct,
        Incorrect,
        TimedOut, 
        Pending
    }
    public class UserAnswer
    {
        [Key]
        public int Id { get; set; }
        public Guid SessionId { get; set; }
        public int QuizQuestionId { get; set; }
        public int? SelectedOptionId { get; set; }
        public string? SubmittedAnswer { get; set; }
        public AnswerStatus Status { get; set; } = AnswerStatus.NotAnswered;
        public int Score { get; set; }

        public DateTime QuestionStartTime { get; set; }

        /// This can be null if the user timed out or hasn't answered yet.
        public DateTime? SubmittedTime { get; set; }

        [ForeignKey(nameof(SessionId))]
        public virtual QuizSession QuizSession { get; set; } = null!;
        [ForeignKey(nameof(QuizQuestionId))]
        public virtual QuizQuestion QuizQuestion { get; set; } = null!;
        [ForeignKey(nameof(SelectedOptionId))]
        [JsonIgnore]
        public virtual AnswerOption? AnswerOption { get; set; }
    }

}
