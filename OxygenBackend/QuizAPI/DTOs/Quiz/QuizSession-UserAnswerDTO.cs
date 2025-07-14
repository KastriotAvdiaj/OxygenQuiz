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
            public bool IsCorrect { get; set; }
            public int Score { get; set; }
            public string QuestionText { get; set; } = string.Empty;
            public string? SelectedOptionText { get; set; }
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
    
}
