using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Quiz;
using QuizAPI.ManyToManyTables;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService
{
    public class SessionAbandonmentService : ISessionAbandonmentService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SessionAbandonmentService> _logger;
        private readonly QuizSessionOptions _options;

        public SessionAbandonmentService(
            ApplicationDbContext context,
            ILogger<SessionAbandonmentService> logger,
            IOptions<QuizSessionOptions> options)
        {
            _context = context;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<bool> IsSessionAbandonedAsync(QuizSession session)
        {
            if (session.IsCompleted) return false;

            var timeouts = await CalculateTimeoutsAsync(session);
            var timeSinceStart = DateTime.UtcNow - session.StartTime;
            var timeSinceLastActivity = session.CurrentQuestionStartTime.HasValue
                ? DateTime.UtcNow - session.CurrentQuestionStartTime.Value
                : timeSinceStart;

            var isAbandoned = timeSinceStart > timeouts.TotalTimeout ||
                             timeSinceLastActivity > timeouts.ActivityTimeout;

            if (isAbandoned)
            {
                _logger.LogInformation(
                    "Session {SessionId} determined as abandoned. Total time: {TotalTime:F1}min (limit: {TotalLimit:F1}min), " +
                    "Activity time: {ActivityTime:F1}min (limit: {ActivityLimit:F1}min)",
                    session.Id, timeSinceStart.TotalMinutes, timeouts.TotalTimeout.TotalMinutes,
                    timeSinceLastActivity.TotalMinutes, timeouts.ActivityTimeout.TotalMinutes);
            }

            return isAbandoned;
        }

        public async Task<QuizSession?> GetActiveSessionForUserAsync(Guid userId, int quizId)
        {
            var activeSessions = await _context.QuizSessions
                .Where(s => s.UserId == userId && s.QuizId == quizId && !s.IsCompleted)
                .Include(s => s.Quiz)
                    .ThenInclude(q => q.QuizQuestions)
                .ToListAsync();

            if (!activeSessions.Any()) return null;

            var sessionsToCleanup = new List<QuizSession>();
            QuizSession? validActiveSession = null;

            foreach (var session in activeSessions)
            {
                if (await IsSessionAbandonedAsync(session))
                {
                    sessionsToCleanup.Add(session);
                }
                else if (validActiveSession == null)
                {
                    validActiveSession = session;
                }
            }

            if (sessionsToCleanup.Any())
            {
                await MarkSessionsAsAbandonedAsync(sessionsToCleanup); // Make this public
            }

            return validActiveSession;
        }

        public async Task<int> CleanupAbandonedSessionsAsync()
        {
            var incompleteSessions = await _context.QuizSessions
                .Where(s => !s.IsCompleted)
                .Include(s => s.Quiz)
                    .ThenInclude(q => q.QuizQuestions)
                .ToListAsync();

            var abandonedSessions = new List<QuizSession>();

            foreach (var session in incompleteSessions)
            {
                if (await IsSessionAbandonedAsync(session))
                {
                    abandonedSessions.Add(session);
                }
            }

            if (abandonedSessions.Any())
            {
                await MarkSessionsAsAbandonedAsync(abandonedSessions);
                _logger.LogInformation("Cleaned up {Count} abandoned sessions", abandonedSessions.Count);
            }

            return abandonedSessions.Count;
        }

        private async Task<(TimeSpan TotalTimeout, TimeSpan ActivityTimeout)> CalculateTimeoutsAsync(QuizSession session)
        {
            var quizQuestions = session.Quiz?.QuizQuestions ??
                               await _context.QuizQuestions
                                   .Where(qq => qq.QuizId == session.QuizId)
                                   .Select(qq => new { qq.TimeLimitInSeconds })
                                   .ToListAsync()
                                   .ContinueWith(t => t.Result.Select(x => new QuizQuestion { TimeLimitInSeconds = x.TimeLimitInSeconds }).ToList());

            var totalQuizTimeSeconds = quizQuestions.Sum(qq => qq.TimeLimitInSeconds) +
                                     quizQuestions.Count * _options.QuestionBufferSeconds;
            var expectedDuration = TimeSpan.FromSeconds(totalQuizTimeSeconds);

            var maxQuestionTime = quizQuestions.Any()
                ? quizQuestions.Max(qq => qq.TimeLimitInSeconds)
                : _options.DefaultMaxQuestionTimeSeconds;

            var totalTimeout = expectedDuration.Add(
                TimeSpan.FromMinutes(expectedDuration.TotalMinutes * _options.TotalTimeoutBufferPercentage));

            var activityTimeout = TimeSpan.FromSeconds(
                maxQuestionTime * _options.ActivityTimeoutMultiplier + _options.ActivityBufferSeconds);

            return (totalTimeout, activityTimeout);
        }

        public async Task MarkSessionsAsAbandonedAsync(List<QuizSession> sessions)
        {
            var sessionIds = sessions.Select(s => s.Id).ToList();

            await _context.QuizSessions
                .Where(s => sessionIds.Contains(s.Id))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.IsCompleted, true)
                    .SetProperty(x => x.EndTime, DateTime.UtcNow)
                    .SetProperty(x => x.CurrentQuizQuestionId, (int?)null)
                    .SetProperty(x => x.CurrentQuestionStartTime, (DateTime?)null)
                    .SetProperty(x => x.AbandonmentReason, AbandonmentReason.Timeout)
                    .SetProperty(x => x.AbandonedAt, DateTime.UtcNow)); ;

            _logger.LogInformation("Marked {Count} sessions as abandoned: {SessionIds}",
                sessions.Count, string.Join(", ", sessionIds));
        }
    }
}
