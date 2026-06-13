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

    /// <summary>
    /// Full analytics payload for a single quiz (the individual-quiz Analytics tab):
    /// headline summary, score distribution, attempts-over-time, and a per-question breakdown.
    /// </summary>
    public sealed class QuizAnalyticsDto
    {
        public int QuizId { get; set; }
        public string Title { get; set; } = string.Empty;

        // Headline summary (mirrors QuizPerformanceRow, scoped to this one quiz).
        public int Attempts { get; set; }
        public int Completed { get; set; }
        public int Abandoned { get; set; }
        public double CompletionRate { get; set; }          // percent
        public double AverageScore { get; set; }            // over completed attempts
        public double AverageDurationSeconds { get; set; }  // over completed attempts
        public int HighestScore { get; set; }               // best completed attempt

        public List<ScoreBucket> ScoreDistribution { get; set; } = new();
        public List<AttemptsByDayPoint> AttemptsOverTime { get; set; } = new();
        public List<QuizQuestionAnalyticsRow> Questions { get; set; } = new();
    }

    /// <summary>One bar of the score-distribution histogram (completed attempts bucketed by score).</summary>
    public sealed class ScoreBucket
    {
        public string Label { get; set; } = string.Empty;  // e.g. "0–20"
        public int Count { get; set; }
    }

    /// <summary>Attempts (and completions) started on a given day, for the trend chart.</summary>
    public sealed class AttemptsByDayPoint
    {
        public DateTime Date { get; set; }
        public int Attempts { get; set; }
        public int Completed { get; set; }
    }

    /// <summary>Per-question outcome stats within one quiz.</summary>
    public sealed class QuizQuestionAnalyticsRow
    {
        public int QuestionId { get; set; }
        public int Order { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int TimesAnswered { get; set; }
        public int CorrectCount { get; set; }
        public int IncorrectCount { get; set; }
        public double CorrectRate { get; set; }            // percent
        public double AverageTimeSeconds { get; set; }     // over answered
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
