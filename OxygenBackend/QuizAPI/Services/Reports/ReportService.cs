using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Reports;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Scoring;

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
        private readonly ILogger<ReportService> _logger;

        public ReportService(ApplicationDbContext context, ILogger<ReportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<QuizPerformanceRow>> GetQuizPerformanceAsync(
            Guid userId, ReportCriteria criteria, CancellationToken ct = default)
        {
            var zone = ResolveViewerZone(criteria);
            var (from, toExclusive) = NormalizeRange(criteria, zone);

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
            var zone = ResolveViewerZone(criteria);
            var (from, toExclusive) = NormalizeRange(criteria, zone);

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
            // past-version copies and would double-count (docs/quiz/quiz-editing.md).
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
            Guid? ownerId, int quizId, ReportCriteria criteria, CancellationToken ct = default)
        {
            var zone = ResolveViewerZone(criteria);
            var (from, toExclusive) = NormalizeRange(criteria, zone);

            // Ownership clamp, not a permission check — the controller has already decided whether
            // this caller may act (CLAUDE.md, "Permission checks in the controller, ownership clamps
            // in the repository"). A null ownerId means an admin reading any quiz's analytics: they
            // can already read and delete every quiz, so withholding its statistics protected
            // nothing while making the admin-only quiz page 404 its own panel.
            var quiz = await _context.Quizzes.AsNoTracking()
                .Where(q => q.Id == quizId && (ownerId == null || q.UserId == ownerId))
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
                    qq.TimeLimitInSeconds,
                    qq.PointSystem,
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

                    // Graded means "has a settled outcome". Pending (awaiting the background
                    // grader) and NotAnswered are excluded from the denominator: a Pending row is
                    // not evidence the player got it wrong, and stranded Pending rows are a real
                    // possibility — the enqueue in SubmitAnswerService logs and continues on
                    // failure. Counting them as failures made a fine question read 0% correct.
                    var graded = outcomes.Count(o => IsGraded(o.Status));

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
                        GradedCount = graded,
                        UngradedCount = outcomes.Count - graded,
                        CorrectCount = correct,
                        IncorrectCount = incorrect,
                        CorrectRate = Percent(correct, graded),
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
                MaxPossibleScore = quizQuestions.Sum(q =>
                    QuizScoring.PointsForCorrectAnswer(
                        TimeSpan.Zero, q.TimeLimitInSeconds, q.PointSystem)),
                ScoreDistribution = BuildScoreDistribution(completed.Select(a => a.TotalScore).ToList()),
                AttemptsOverTime = BuildAttemptsOverTime(
                    sessions.Select(s => (s.StartTime, s.IsCompleted, s.Abandoned)), zone),
                Questions = questionRows,
            };
        }

        /// <summary>
        /// Which calendar day each attempt is counted under, and in whose clock.
        ///
        /// <b>This used to group on <c>s.StartTime.Date</c> — the raw UTC date.</b> Storage was
        /// never the problem: <c>StartTime</c> is written from <c>DateTime.UtcNow</c> into a
        /// <c>timestamp with time zone</c> column and read back as <c>Kind=Utc</c>, so the
        /// *instant* of every attempt is exact. Truncating that instant in UTC was the bug — a
        /// play at 01:00 in UTC+2 was charted on the previous day, and an owner in Prishtina
        /// reading their own quiz's chart saw their evening plays land on yesterday.
        ///
        /// Shifting into the viewer's zone first answers the question this panel is actually
        /// asked: "when are attempts arriving, in my time". It does **not** answer "what time of
        /// day do players play" — that needs the player's own zone captured at session creation,
        /// which is a new nullable column and a separate piece of work
        /// (docs/proposals/quiz-view-redesign.md §8, step 2).
        ///
        /// The grouping already ran in memory after <c>.ToListAsync()</c>, so this costs nothing
        /// extra in SQL.
        ///
        /// <b>Completed counts only genuine completions</b>, matching the headline figure.
        /// Abandoned-by-timeout sessions carry <c>IsCompleted = true</c>, and the old
        /// <c>g.Count(s => s.IsCompleted)</c> here counted them — so the chart's Completed series
        /// could run above the completion rate printed beside it.
        /// </summary>
        private static List<AttemptsByDayPoint> BuildAttemptsOverTime(
            IEnumerable<(DateTime StartTime, bool IsCompleted, bool Abandoned)> sessions,
            TimeZoneInfo zone) =>
            sessions
                .GroupBy(s => TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.SpecifyKind(s.StartTime, DateTimeKind.Utc), zone).Date)
                .OrderBy(g => g.Key)
                .Select(g => new AttemptsByDayPoint
                {
                    // Unspecified, not Utc: this is a wall-clock day in the viewer's zone, and
                    // the absent trailing Z is what makes the browser read it as one. See
                    // AttemptsByDayPoint.Date.
                    Date = DateTime.SpecifyKind(g.Key, DateTimeKind.Unspecified),
                    Attempts = g.Count(),
                    Completed = g.Count(s => s.IsCompleted && !s.Abandoned),
                })
                .ToList();

        /// <summary>
        /// The zone to bucket days in: the caller's IANA name, else their raw UTC offset, else
        /// UTC.
        ///
        /// The offset fallback exists because <c>FindSystemTimeZoneById</c> needs tzdata, and
        /// whether the runtime image ships it is a deployment property rather than something this
        /// code can assert. If the name ever fails to resolve, an offset is still far closer than
        /// UTC — see <see cref="ReportCriteria.OffsetMinutes"/> for what it gives up.
        /// </summary>
        private TimeZoneInfo ResolveViewerZone(ReportCriteria criteria)
        {
            if (!string.IsNullOrWhiteSpace(criteria.TimeZone))
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(criteria.TimeZone);
                }
                catch (Exception ex) when (
                    ex is TimeZoneNotFoundException || ex is InvalidTimeZoneException)
                {
                    _logger.LogWarning(ex,
                        "Unknown time zone '{TimeZone}' — is tzdata present in the image? Falling back to the reported offset, then UTC.",
                        criteria.TimeZone);
                }
            }

            if (criteria.OffsetMinutes is int minutes && Math.Abs(minutes) <= 14 * 60)
            {
                var offset = TimeSpan.FromMinutes(minutes);
                var id = $"UTC{(minutes < 0 ? '-' : '+')}{offset.Duration():hh\\:mm}";
                return TimeZoneInfo.CreateCustomTimeZone(id, offset, id, id);
            }

            return TimeZoneInfo.Utc;
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
        // UTC (timestamptz), and Npgsql requires comparison values to be Kind=Utc, so we convert.
        //
        // The day boundaries are anchored in the CALLER'S zone, for the same reason the buckets
        // are: "attempts from the 1st to the 7th" should mean the caller's 1st and 7th. With no
        // zone supplied the zone resolves to UTC and this behaves exactly as it did — which is
        // the case for both other reports, neither of which sends one.
        private static (DateTime? From, DateTime? ToExclusive) NormalizeRange(
            ReportCriteria criteria, TimeZoneInfo zone)
        {
            return (
                criteria.From.HasValue ? StartOfDayUtc(criteria.From.Value, zone) : null,
                criteria.To.HasValue ? StartOfDayUtc(criteria.To.Value.AddDays(1), zone) : null);
        }

        /// <summary>
        /// Midnight on <paramref name="local"/> in <paramref name="zone"/>, as a UTC instant.
        ///
        /// A handful of zones spring forward AT midnight (so 00:00 simply does not exist on that
        /// date) and a few fall back through it (so it happens twice). `ConvertTimeToUtc` throws
        /// on the first and silently picks standard time on the second, and neither is worth
        /// failing a report over: walk forward to the first valid minute instead.
        /// </summary>
        private static DateTime StartOfDayUtc(DateTime local, TimeZoneInfo zone)
        {
            var midnight = DateTime.SpecifyKind(local.Date, DateTimeKind.Unspecified);

            for (var i = 0; i < 180 && zone.IsInvalidTime(midnight); i++)
                midnight = midnight.AddMinutes(1);

            return zone.IsInvalidTime(midnight)
                ? DateTime.SpecifyKind(local.Date, DateTimeKind.Utc)
                : TimeZoneInfo.ConvertTimeToUtc(midnight, zone);
        }

        /// <summary>
        /// True when an answer has a settled outcome. TimedOut counts: the player was shown the
        /// question and did not answer it correctly in time, which is exactly what a correct rate
        /// is measuring. Pending and NotAnswered do not — neither is evidence either way.
        /// </summary>
        private static bool IsGraded(AnswerStatus status) =>
            status == AnswerStatus.Correct
            || status == AnswerStatus.Incorrect
            || status == AnswerStatus.TimedOut;

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
