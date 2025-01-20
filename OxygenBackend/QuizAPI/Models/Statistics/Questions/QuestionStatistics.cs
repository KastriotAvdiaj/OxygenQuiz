using System.Text.Json.Serialization;

namespace QuizAPI.Models.Statistics.Questions
{
    public class QuestionStatistics
    {
        
            public int Id { get; set; }
            public int QuestionId { get; set; } // Foreign key to the Question entity

            public int TimesUsedInQuizzes { get; set; } // Number of quizzes this question is part of
            public int TimesAnsweredCorrectly { get; set; } // Number of times the question was answered correctly
            public int TimesAnsweredIncorrectly { get; set; } // Number of times the question was answered incorrectly

            [JsonIgnore]
            public Question Question { get; set; }
        
    }
}
