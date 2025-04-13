using System.Text.Json.Serialization;

namespace QuizAPI.Models
{

    public class AnswerOption
    {
        public int Id { get; set; }
        public string Text { get; set; }
        public bool IsCorrect { get; set; }
        public int QuestionId { get; set; }

        [JsonIgnore]
        public MultipleChoiceQuestion Question { get; set; }
    }
}
