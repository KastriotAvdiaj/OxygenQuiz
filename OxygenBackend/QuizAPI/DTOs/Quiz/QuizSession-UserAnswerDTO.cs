using QuizAPI.DTOs.Question;
using QuizAPI.Models.Quiz;

namespace QuizAPI.DTOs.Quiz
{
   
        public class QuizSessionCM
        {
            public int QuizId { get; set; }
            public Guid UserId { get; set; }
        }

        public class UserAnswerCM
        {
            public Guid SessionId { get; set; }
            public int QuizQuestionId { get; set; }
            public int? SelectedOptionId { get; set; }
            public string? SubmittedAnswer { get; set; }
        }

        // Data Transfer Objects
        public class QuizSessionDto
        {
            public Guid Id { get; set; }
            public int QuizId { get; set; }
            public string QuizTitle { get; set; } = string.Empty;
            public Guid UserId { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime? EndTime { get; set; }
            public int TotalScore { get; set; }
            public bool IsCompleted { get; set; }
            public List<UserAnswerDto> UserAnswers { get; set; } = new();
        }

        public class UserAnswerDto
        {
            public int Id { get; set; }
            public Guid SessionId { get; set; }
            public int QuizQuestionId { get; set; }
            public int? SelectedOptionId { get; set; }
            public string? SubmittedAnswer { get; set; }
            public AnswerStatus Status { get; set; }
            public int Score { get; set; }
            public string QuestionText { get; set; } = string.Empty;
            public string? SelectedOptionText { get; set; }
        }

    public class CurrentQuestionDto
    {
        public int QuizQuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public List<AnswerOptionDTO> Options { get; set; } = new();
        public int TimeLimitInSeconds { get; set; }
        public int TimeRemainingInSeconds { get; set; }
    }

    public class QuizSessionSummaryDto
        {
            public Guid Id { get; set; }
            public string QuizTitle { get; set; } = string.Empty;
            public DateTime StartTime { get; set; }
            public DateTime? EndTime { get; set; }
            public int TotalScore { get; set; }
            public int TotalQuestions { get; set; }
            public int CorrectAnswers { get; set; }
            public bool IsCompleted { get; set; }
            public TimeSpan? Duration { get; set; }
        }

    public class AnswerResultDto
    {
        /// <summary>
        /// The outcome of the answer submission (e.g., Correct, Incorrect, TimedOut).
        /// </summary>
        public AnswerStatus Status { get; set; }

        /// <summary>
        /// The score awarded for this specific answer. Will be 0 if incorrect or timed out.
        /// </summary>
        public int ScoreAwarded { get; set; }

        /// <summary>
        /// A flag indicating whether this was the last question in the quiz.
        /// The client uses this to know whether to enable a "Next Question" button
        /// or navigate to the final results screen.
        /// </summary>
        public bool IsQuizComplete { get; set; }
    }

}
