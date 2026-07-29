using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Users.Services.UserStatsService
{
    /// <summary>
    /// Computes profile play-stats on read with two grouped SQL aggregates (one over sessions,
    /// one over answers) — nothing is materialised beyond the two aggregate rows and there are
    /// no denormalised counters to drift out of sync. At current scale this is comfortably fast;
    /// if it ever isn't, the documented upgrade path (docs/quiz/user-stats-history.md) is a
    /// short-TTL cache in front of this method, NOT write-side counters.
    /// </summary>
    public class UserStatsService : IUserStatsService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserStatsService> _logger;

        public UserStatsService(ApplicationDbContext context, ILogger<UserStatsService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Result<UserQuizStatsDto>> GetUserQuizStatsAsync(Guid userId, CancellationToken ct = default)
        {
            try
            {
                // Guest sessions are transient (deleted after results are viewed) and all share
                // the shared guest account id — never let them leak into anyone's stats.
                var sessions = _context.QuizSessions
                    .AsNoTracking()
                    .Where(s => s.UserId == userId && !s.IsGuestSession);

                // Completed = finished the quiz; abandoned sessions carry a reason and are
                // reported separately, matching the analytics convention in docs/quiz/reports.md.
                var completed = sessions.Where(s => s.IsCompleted && s.AbandonmentReason == null);

                var sessionAgg = await sessions
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        Played = g.Count(s => s.IsCompleted && s.AbandonmentReason == null),
                        Abandoned = g.Count(s => s.AbandonmentReason != null),
                        LastPlayedAt = g.Max(s => (DateTime?)s.StartTime),
                    })
                    .FirstOrDefaultAsync(ct);

                // Score aggregates only over sessions that actually finished — an abandoned
                // half-quiz's TotalScore would drag the average into meaninglessness.
                var scoreAgg = await completed
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        AvgScore = g.Average(s => (double?)s.TotalScore),
                        BestScore = g.Max(s => (int?)s.TotalScore),
                        DistinctQuizzes = g.Select(s => s.QuizId).Distinct().Count(),
                    })
                    .FirstOrDefaultAsync(ct);

                // Answer-level aggregates: only graded outcomes count toward accuracy
                // (Pending answers aren't results yet; NotAnswered rows carry no attempt).
                var gradedAnswers = _context.UserAnswers
                    .AsNoTracking()
                    .Where(a => a.QuizSession.UserId == userId && !a.QuizSession.IsGuestSession)
                    .Where(a => a.Status == AnswerStatus.Correct
                             || a.Status == AnswerStatus.Incorrect
                             || a.Status == AnswerStatus.TimedOut);

                var answerAgg = await gradedAnswers
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        Total = g.Count(),
                        Correct = g.Count(a => a.Status == AnswerStatus.Correct),
                    })
                    .FirstOrDefaultAsync(ct);

                // Average answer time is computed in memory on purpose. Npgsql can't translate
                // TimeSpan.TotalSeconds over a DateTime difference, so the timestamps are pulled
                // down and subtracted here — the same approach ReportService takes. Only the two
                // DateTime columns of this user's own answered questions are read (no entities,
                // no navigations), so the payload stays small.
                // If this ever becomes hot, the fix is a persisted elapsed-ms column written at
                // submit time, not a bigger query.
                var elapsedTimes = await gradedAnswers
                    .Where(a => a.SubmittedTime != null)
                    .Select(a => new { a.QuestionStartTime, a.SubmittedTime })
                    .ToListAsync(ct);

                var answerSeconds = elapsedTimes
                    .Select(t => (t.SubmittedTime!.Value - t.QuestionStartTime).TotalSeconds)
                    .Where(seconds => seconds >= 0) // defensive: clock skew must not skew the mean
                    .ToList();

                var stats = new UserQuizStatsDto
                {
                    QuizzesPlayed = sessionAgg?.Played ?? 0,
                    QuizzesAbandoned = sessionAgg?.Abandoned ?? 0,
                    LastPlayedAt = sessionAgg?.LastPlayedAt,
                    DistinctQuizzesPlayed = scoreAgg?.DistinctQuizzes ?? 0,
                    AverageScore = Math.Round(scoreAgg?.AvgScore ?? 0, 1),
                    BestScore = scoreAgg?.BestScore ?? 0,
                    TotalQuestionsAnswered = answerAgg?.Total ?? 0,
                    TotalCorrectAnswers = answerAgg?.Correct ?? 0,
                    AccuracyPercent = answerAgg is { Total: > 0 }
                        ? Math.Round(100.0 * answerAgg.Correct / answerAgg.Total, 1)
                        : 0,
                    AverageAnswerTimeSeconds = answerSeconds.Count == 0
                        ? 0
                        : Math.Round(answerSeconds.Average(), 2),
                };

                return Result<UserQuizStatsDto>.Success(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error computing quiz stats for user {UserId}", userId);
                return Result<UserQuizStatsDto>.Failure("Failed to compute quiz statistics.");
            }
        }
    }
}
