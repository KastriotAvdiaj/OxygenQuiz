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

        /// <summary>
        /// The viewer's IANA time zone (<c>Europe/Belgrade</c>), from the browser's
        /// <c>Intl.DateTimeFormat().resolvedOptions().timeZone</c>. Decides which calendar day an
        /// attempt is counted under — see <see cref="OffsetMinutes"/> and
        /// <c>ReportService.ResolveViewerZone</c>. Omitted or unrecognised ⇒ UTC.
        /// </summary>
        public string? TimeZone { get; set; }

        /// <summary>
        /// Fallback for <see cref="TimeZone"/>: the viewer's current UTC offset in minutes, east
        /// of UTC positive (so UTC+2 is <c>120</c>). Note this is the **inverse** of JavaScript's
        /// <c>getTimezoneOffset()</c>, which returns -120 for the same zone; the client negates
        /// before sending.
        ///
        /// Used only when the IANA name can't be resolved, which happens if the container is ever
        /// built without tzdata. It is a fixed offset, so it is wrong for attempts on the other
        /// side of a DST boundary — but wrong by an hour beats wrong by a whole day, which is
        /// what falling all the way back to UTC would mean for anyone east of Greenwich.
        /// </summary>
        public int? OffsetMinutes { get; set; }
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

        /// <summary>
        /// The score a flawless run of the quiz's CURRENT questions would earn: every question
        /// correct, every one answered instantly. Gives <see cref="AverageScore"/> and
        /// <see cref="HighestScore"/> a denominator — a bare "3,412" is uninterpretable without it.
        /// Derived from <see cref="QuizAPI.Services.Scoring.QuizScoring"/> so it can never drift
        /// from what the grader actually awards. Zero when the quiz has no live questions.
        /// </summary>
        public int MaxPossibleScore { get; set; }

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
        /// <summary>
        /// Midnight on the day this bucket covers, <b>in the viewer's time zone</b>, with
        /// <see cref="DateTimeKind.Unspecified"/> — so it serializes as <c>2026-09-11T00:00:00</c>
        /// with **no trailing Z**.
        ///
        /// That absent Z is load-bearing. It is a wall-clock date, not an instant, and JavaScript
        /// parses an offset-less date-time as local time — so `new Date(point.date)` in the
        /// browser lands on the same calendar day the server bucketed it under. Stamping it Utc
        /// (which is what produced the old <c>T00:00:00Z</c>) would make every client west of
        /// Greenwich render the label one day early.
        /// </summary>
        public DateTime Date { get; set; }
        public int Attempts { get; set; }
        public int Completed { get; set; }
    }

    /// <summary>
    /// Per-question outcome stats within one quiz.
    ///
    /// <b><see cref="TimesAnswered"/> and <see cref="GradedCount"/> are different numbers</b> and
    /// the gap between them is meaningful. A submission on a quiz with
    /// <c>ShowFeedbackImmediately = false</c> is persisted as <c>AnswerStatus.Pending</c> and
    /// graded by a background job — and <c>SubmitAnswerService.TryEnqueueBackgroundGrading</c>
    /// logs-and-continues when the enqueue fails, so an answer can sit in Pending indefinitely.
    /// <see cref="CorrectRate"/> is computed over graded answers only; counting Pending rows in
    /// the denominator made a perfectly good question read as 0% correct.
    /// </summary>
    public sealed class QuizQuestionAnalyticsRow
    {
        public int QuestionId { get; set; }
        public int Order { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;

        /// <summary>Every submission recorded against this question, graded or not.</summary>
        public int TimesAnswered { get; set; }

        /// <summary>
        /// Submissions with a settled outcome — Correct, Incorrect or TimedOut. The denominator
        /// of <see cref="CorrectRate"/>. A timeout is graded: the player was shown the question
        /// and failed to answer it correctly in time.
        /// </summary>
        public int GradedCount { get; set; }

        /// <summary>
        /// Submissions still awaiting background grading (<c>TimesAnswered - GradedCount</c>).
        /// Non-zero here means the rate describes only part of the answers, and any surface
        /// showing the rate should say so.
        /// </summary>
        public int UngradedCount { get; set; }

        public int CorrectCount { get; set; }
        public int IncorrectCount { get; set; }

        /// <summary>Correct as a percentage of <see cref="GradedCount"/>, not of TimesAnswered.</summary>
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
