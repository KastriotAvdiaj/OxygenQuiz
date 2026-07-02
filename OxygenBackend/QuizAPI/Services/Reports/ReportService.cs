using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Reports;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Services.Reports
{
    /// <summary>
    /// Reporting read-model. These are cross-aggregate analytical queries (sessions × quizzes,
    /// answers × questions), so they live in one service rather than being split across the
    /// per-entity repositories — a common and deliberate exception to the repository pattern for
    /// read-only reporting.
    ///
    /// Each report lists ALL of the user's owned items (so a quiz/question with zero activity still
    /// shows up with zeros), and the date criteria filters only the activity counted within them.
    /// </summary>
    public class ReportService : IReportService
    {
        private readonly ApplicationDbContext _context;

        public ReportService(ApplicationDbContext context) => _context = context;

        public async Task<List<QuizPerformanceRow>> GetQuizPerformanceAsync(
            Guid userId, ReportCriteria criteria, CancellationToken ct = default)
        {
            var (from, toExclusive) = NormalizeRange(criteria);

            // The user's quizzes (so quizzes with no attempts still appear).
            var quizzes = await _context.Quizzes.AsNoTracking()
                .Where(q => q.UserId == userId)
                .Select(q => new { q.Id, q.Title })
                .ToListAsync(ct);

            // Their sessions within the date window.
            var sessions = await _context.QuizSessions.AsNoTracking()
                .Where(s => s.Quiz.UserId == userId)
                .Where(s => from == null || s.StartTime >= from)
                .Where(s => toExclusive == null || s.StartTime < toExclusive)
                .Select(s => new
                {
                    s.QuizId,
                    s.TotalScore,
                    s.IsCompleted,
                    s.StartTime,
                    s.EndTime,
                    Abandoned = s.AbandonedAt != null,
                })
                .ToListAsync(ct);

            var byQuiz = sessions.ToLookup(s => s.QuizId);

            return quizzes
                .Select(q =>
                {
                    var attempts = byQuiz[q.Id].ToList();
                    // A session abandoned by timeout is flagged IsCompleted, so exclude abandoned
                    // ones here: a "completion" means the user actually finished the quiz, and an
                    // abandoned session's wall-clock duration is idle time, not play time.
                    var completed = attempts.Where(a => a.IsCompleted && !a.Abandoned).ToList();

                    return new QuizPerformanceRow
                    {
                        QuizId = q.Id,
                        Title = q.Title,
                        Attempts = attempts.Count,
                        Completed = completed.Count,
                        Abandoned = attempts.Count(a => a.Abandoned),
                        CompletionRate = Percent(completed.Count, attempts.Count),
                        AverageScore = completed.Count == 0 ? 0 : Math.Round(completed.Average(a => (double)a.TotalScore), 1),
                        AverageDurationSeconds = AverageDuration(completed.Select(a => (a.StartTime, a.EndTime))),
                    };
                })
                .OrderByDescending(r => r.Attempts)
                .ThenBy(r => r.Title)
                .ToList();
        }

        public async Task<List<QuestionAnalyticsRow>> GetQuestionAnalyticsAsync(
            Guid userId, ReportCriteria criteria, CancellationToken ct = default)
        {
            var (from, toExclusive) = NormalizeRange(criteria);

            // The user's questions (so unanswered ones still appear).
            var questions = await _context.Questions.AsNoTracking()
                .Where(q => q.UserId == userId)
                .Select(q => new
                {
                    q.Id,
                    q.Text,
                    q.Type,
                    Category = q.Category.Name,
                })
                .ToListAsync(ct);

            // How many quizzes each owned question is used in. Live rows only — retired rows are
            // past-version copies and would double-count (docs/quiz-editing.md).
            var usage = await _context.QuizQuestions.AsNoTracking()
                .Where(qq => qq.Question.UserId == userId && qq.RemovedInVersion == null)
                .GroupBy(qq => qq.QuestionId)
                .Select(g => new { QuestionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.QuestionId, x => x.Count, ct);

            // Answer outcomes within the date window.
            var answers = await _context.UserAnswers.AsNoTracking()
                .Where(a => a.QuizQuestion.Question.UserId == userId)
                .Where(a => from == null || (a.SubmittedTime != null && a.SubmittedTime >= from))
                .Where(a => toExclusive == null || (a.SubmittedTime != null && a.SubmittedTime < toExclusive))
                .Select(a => new
                {
                    QuestionId = a.QuizQuestion.QuestionId,
                    a.Status,
                })
                .ToListAsync(ct);

            var byQuestion = answers.ToLookup(a => a.QuestionId);

            return questions
                .Select(q =>
                {
                    var outcomes = byQuestion[q.Id].ToList();
                    var correct = outcomes.Count(o => o.Status == AnswerStatus.Correct);
                    var incorrect = outcomes.Count(o => o.Status == AnswerStatus.Incorrect);

                    return new QuestionAnalyticsRow
                    {
                        QuestionId = q.Id,
                        Text = Truncate(q.Text, 100),
                        Type = q.Type.ToString(),
                        Category = q.Category ?? string.Empty,
                        TimesUsedInQuizzes = usage.GetValueOrDefault(q.Id),
                        TimesAnswered = outcomes.Count,
                        CorrectCount = correct,
                        IncorrectCount = incorrect,
                        CorrectRate = Percent(correct, outcomes.Count),
                    };
                })
                .OrderByDescending(r => r.TimesAnswered)
                .ThenBy(r => r.Text)
                .ToList();
        }

        public async Task<QuizAnalyticsDto?> GetQuizAnalyticsAsync(
            Guid userId, int quizId, ReportCriteria criteria, CancellationToken ct = default)
        {
            var (from, toExclusive) = NormalizeRange(criteria);

            // Ownership gate: only the quiz's creator may view its analytics.
            var quiz = await _context.Quizzes.AsNoTracking()
                .Where(q => q.Id == quizId && q.UserId == userId)
                .Select(q => new { q.Id, q.Title })
                .FirstOrDefaultAsync(ct);
            if (quiz is null) return null;

            // Sessions for this quiz within the window.
            var sessions = await _context.QuizSessions.AsNoTracking()
                .Where(s => s.QuizId == quizId)
                .Where(s => from == null || s.StartTime >= from)
                .Where(s => toExclusive == null || s.StartTime < toExclusive)
                .Select(s => new
                {
                    s.TotalScore,
                    s.IsCompleted,
                    s.StartTime,
                    s.EndTime,
                    Abandoned = s.AbandonedAt != null,
                })
                .ToListAsync(ct);

            // Abandoned-by-timeout sessions are flagged IsCompleted, but they aren't real
            // completions — their wall-clock duration is mostly idle time and would skew the
            // averages (e.g. a quiz "taking" 42 minutes). Count only genuinely finished sessions.
            var completed = sessions.Where(s => s.IsCompleted && !s.Abandoned).ToList();

            // The quiz's CURRENT questions (so a question with no answers still appears with
            // zeros). Retired rows are excluded — an edited question would otherwise show up
            // twice (answers are matched by QuestionId, so history from before an edit still
            // counts toward the live row). Answers to questions REMOVED from the quiz drop out
            // of this per-question table but still count in the session aggregates above.
            var quizQuestions = await _context.QuizQuestions.AsNoTracking()
                .Where(qq => qq.QuizId == quizId && qq.RemovedInVersion == null)
                .Select(qq => new
                {
                    qq.QuestionId,
                    qq.OrderInQuiz,
                    Text = qq.Question.Text,
                    Type = qq.Question.Type,
                })
                .ToListAsync(ct);

            // Answers to this quiz's questions within the window.
            var answers = await _context.UserAnswers.AsNoTracking()
                .Where(a => a.QuizQuestion.QuizId == quizId)
                .Where(a => from == null || (a.SubmittedTime != null && a.SubmittedTime >= from))
                .Where(a => toExclusive == null || (a.SubmittedTime != null && a.SubmittedTime < toExclusive))
                .Select(a => new
                {
                    a.QuizQuestion.QuestionId,
                    a.Status,
                    a.QuestionStartTime,
                    a.SubmittedTime,
                })
                .ToListAsync(ct);

            var answersByQuestion = answers.ToLookup(a => a.QuestionId);

            var questionRows = quizQuestions
                .OrderBy(q => q.OrderInQuiz)
                .Select(q =>
                {
                    var outcomes = answersByQuestion[q.QuestionId].ToList();
                    var correct = outcomes.Count(o => o.Status == AnswerStatus.Correct);
                    var incorrect = outcomes.Count(o => o.Status == AnswerStatus.Incorrect);

                    var times = outcomes
                        .Where(o => o.SubmittedTime != null)
                        .Select(o => (o.SubmittedTime!.Value - o.QuestionStartTime).TotalSeconds)
                        .Where(seconds => seconds >= 0)
                        .ToList();

                    return new QuizQuestionAnalyticsRow
                    {
                        QuestionId = q.QuestionId,
                        Order = q.OrderInQuiz,
                        Text = Truncate(q.Text, 120),
                        Type = q.Type.ToString(),
                        TimesAnswered = outcomes.Count,
                        CorrectCount = correct,
                        IncorrectCount = incorrect,
                        CorrectRate = Percent(correct, outcomes.Count),
                        AverageTimeSeconds = times.Count == 0 ? 0 : Math.Round(times.Average(), 1),
                    };
                })
                .ToList();

            return new QuizAnalyticsDto
            {
                QuizId = quiz.Id,
                Title = quiz.Title,
                Attempts = sessions.Count,
                Completed = completed.Count,
                Abandoned = sessions.Count(s => s.Abandoned),
                CompletionRate = Percent(completed.Count, sessions.Count),
                AverageScore = completed.Count == 0 ? 0 : Math.Round(completed.Average(a => (double)a.TotalScore), 1),
                AverageDurationSeconds = AverageDuration(completed.Select(a => (a.StartTime, a.EndTime))),
                HighestScore = completed.Count == 0 ? 0 : completed.Max(a => a.TotalScore),
                ScoreDistribution = BuildScoreDistribution(completed.Select(a => a.TotalScore).ToList()),
                AttemptsOverTime = sessions
                    .GroupBy(s => s.StartTime.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new AttemptsByDayPoint
                    {
                        Date = g.Key,
                        Attempts = g.Count(),
                        Completed = g.Count(s => s.IsCompleted),
                    })
                    .ToList(),
                Questions = questionRows,
            };
        }

        // Bucket completed-attempt scores into 5 equal-width bands from 0 to the highest score.
        // Returns an empty list when there are no completed attempts (nothing to plot).
        private static List<ScoreBucket> BuildScoreDistribution(List<int> scores)
        {
            if (scores.Count == 0) return new List<ScoreBucket>();

            var max = scores.Max();
            if (max <= 0)
                return new List<ScoreBucket> { new() { Label = "0", Count = scores.Count } };

            const int bucketCount = 5;
            var width = (int)Math.Ceiling(max / (double)bucketCount);
            var buckets = new List<ScoreBucket>();

            for (var i = 0; i < bucketCount; i++)
            {
                var lo = i * width;
                var hi = (i + 1) * width;            // exclusive upper bound (inclusive on the last)
                var isLast = i == bucketCount - 1;

                var count = scores.Count(s => s >= lo && (isLast ? s <= hi : s < hi));
                buckets.Add(new ScoreBucket { Label = $"{lo}–{hi}", Count = count });
            }

            return buckets;
        }

        // Date-only criteria read inclusively: "from" snaps to the start of the day, "to" to the
        // start of the next day (so the whole "to" day is included). The timestamps are stored as
        // UTC (timestamptz), and Npgsql requires comparison values to be Kind=Utc, so we mark them.
        private static (DateTime? From, DateTime? ToExclusive) NormalizeRange(ReportCriteria criteria)
        {
            DateTime? from = criteria.From.HasValue
                ? DateTime.SpecifyKind(criteria.From.Value.Date, DateTimeKind.Utc)
                : null;

            DateTime? toExclusive = criteria.To.HasValue
                ? DateTime.SpecifyKind(criteria.To.Value.Date.AddDays(1), DateTimeKind.Utc)
                : null;

            return (from, toExclusive);
        }

        private static double Percent(int part, int total) =>
            total == 0 ? 0 : Math.Round(100.0 * part / total, 1);

        private static double AverageDuration(IEnumerable<(DateTime Start, DateTime? End)> spans)
        {
            var durations = spans
                .Where(s => s.End != null)
                .Select(s => (s.End!.Value - s.Start).TotalSeconds)
                .Where(seconds => seconds >= 0)
                .ToList();

            return durations.Count == 0 ? 0 : Math.Round(durations.Average(), 0);
        }

        private static string Truncate(string value, int max) =>
            string.IsNullOrEmpty(value) || value.Length <= max ? value : value.Substring(0, max) + "…";
    }
}
