namespace QuizAPI.DTOs.Reports
{
    /// <summary>
    /// Criteria a report is generated against. Bound from the query string
    /// (<c>?from=2026-01-01&amp;to=2026-02-01</c>). Both bounds are optional; a date-only value is
    /// treated inclusively (the whole "to" day is included).
    /// </summary>
    public sealed class ReportCriteria
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
    }

    /// <summary>One row of the Quiz Performance report — aggregates for a quiz the user owns.</summary>
    public sealed class QuizPerformanceRow
    {
        public int QuizId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int Attempts { get; set; }
        public int Completed { get; set; }
        public int Abandoned { get; set; }
        public double CompletionRate { get; set; }        // percent
        public double AverageScore { get; set; }          // over completed attempts
        public double AverageDurationSeconds { get; set; } // over completed attempts
    }

    /// <summary>One row of the Question Analytics report — for a question the user owns.</summary>
    public sealed class QuestionAnalyticsRow
    {
        public int QuestionId { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int TimesUsedInQuizzes { get; set; }
        public int TimesAnswered { get; set; }
        public int CorrectCount { get; set; }
        public int IncorrectCount { get; set; }
        public double CorrectRate { get; set; }           // percent
    }
}
