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

        /// <summary>
        /// Whether this session has stopped being resumable. Defined as "now is past
        /// <see cref="GetAbandonmentDeadlineAsync"/>" and nothing else, so the verdict the server
        /// acts on and the deadline it publishes to the client are the same number by
        /// construction. Written as two separate comparisons this drifted the moment either was
        /// touched, and the client had no way to see either of them.
        /// </summary>
        public async Task<bool> IsSessionAbandonedAsync(QuizSession session)
        {
            if (session.IsCompleted) return false;

            var deadline = await GetAbandonmentDeadlineAsync(session);
            var isAbandoned = DateTime.UtcNow > deadline;

            if (isAbandoned)
            {
                _logger.LogInformation(
                    "Session {SessionId} determined as abandoned. Deadline was {Deadline:O}, " +
                    "{Overdue:F1}min ago (started {Started:O}, last activity {LastActivity:O})",
                    session.Id, deadline, (DateTime.UtcNow - deadline).TotalMinutes,
                    session.StartTime, session.CurrentQuestionStartTime ?? session.StartTime);
            }

            return isAbandoned;
        }

        /// <inheritdoc />
        public async Task<DateTime> GetAbandonmentDeadlineAsync(QuizSession session)
        {
            var timeouts = await CalculateTimeoutsAsync(session);

            // No question served yet means the session's own start is its last activity: a session
            // created and then never played still ages out.
            var lastActivity = session.CurrentQuestionStartTime ?? session.StartTime;

            var byTotalTime = session.StartTime + timeouts.TotalTimeout;
            var byInactivity = lastActivity + timeouts.ActivityTimeout;

            // The earlier of the two. Whichever one fires, the session is done — so the deadline
            // the player is shown is the first of them, not the last.
            return byTotalTime < byInactivity ? byTotalTime : byInactivity;
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
            // Timeout math must mirror what the player is actually served: only the rows visible
            // to the session's pinned quiz version (docs/quiz/quiz-editing.md).
            var sessionVersion = session.QuizVersion;
            var quizQuestions = session.Quiz?.QuizQuestions
                                   .Where(qq => qq.IsVisibleToVersion(sessionVersion))
                                   .ToList() ??
                               await _context.QuizQuestions
                                   .Where(qq => qq.QuizId == session.QuizId
                                       && qq.CreatedInVersion <= sessionVersion
                                       && (qq.RemovedInVersion == null || qq.RemovedInVersion > sessionVersion))
                                   .Select(qq => new { qq.TimeLimitInSeconds })
                                   .ToListAsync()
                                   .ContinueWith(t => t.Result.Select(x => new QuizQuestion { TimeLimitInSeconds = x.TimeLimitInSeconds }).ToList());

            var totalQuizTimeSeconds = quizQuestions.Sum(qq => qq.TimeLimitInSeconds) +
                                     quizQuestions.Count * _options.QuestionBufferSeconds;
            var expectedDuration = TimeSpan.FromSeconds(totalQuizTimeSeconds);

            var totalTimeout = expectedDuration.Add(
                TimeSpan.FromMinutes(expectedDuration.TotalMinutes * _options.TotalTimeoutBufferPercentage));

            // ── The activity timeout must not be able to outrun the catch-up walk ──────────────
            //
            // `ResolveAndResumeAsync` checks abandonment FIRST, and only then walks the expired
            // questions. So any absence this timeout calls "abandoned" is an absence the walk
            // never gets to resolve — and if that absence is shorter than the walk's own reach,
            // the walk is unreachable and the "Session In Progress" screen is offering a resume
            // the server will refuse.
            //
            // The walk's reach is bounded by the total playable time of the session's unanswered
            // questions, which is at most every visible question's limit. Setting the timeout to
            // the whole quiz's playable time plus a grace therefore guarantees the invariant:
            //
            //     activityTimeout > (the longest catch-up the walk could ever perform)
            //
            // so abandonment can only fire once the walk would have run out of questions anyway.
            // Using every question rather than just the unanswered ones over-estimates late in a
            // quiz, and that is the deliberate direction: too generous costs a stale row the
            // total-time cap reaps anyway, too tight costs a player their session.
            //
            // It used to be `longestQuestion * 2 + 60s` — two minutes for a quiz of 30-second
            // questions, which voided any absence long enough to expire three questions. The
            // catch-up walk, its client-side mirror and the whole resume screen were dead code in
            // production. See docs/adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md.
            var activityTimeout = quizQuestions.Count > 0
                ? TimeSpan.FromSeconds(totalQuizTimeSeconds + _options.ActivityBufferSeconds)
                : TimeSpan.FromSeconds(_options.FallbackActivityTimeoutSeconds);

            return (totalTimeout, activityTimeout);
        }

        public async Task MarkSessionsAsAbandonedAsync(List<QuizSession> sessions)
        {
            // Guest sessions are never meant to outlive the attempt (see docs/auth/guest-play.md) —
            // an abandoned guest quiz is deleted outright instead of being kept around as
            // "completed". Real-account sessions keep the existing mark-as-abandoned behavior.
            var guestSessionIds = sessions.Where(s => s.IsGuestSession).Select(s => s.Id).ToList();
            var realSessionIds = sessions.Where(s => !s.IsGuestSession).Select(s => s.Id).ToList();

            if (guestSessionIds.Count > 0)
            {
                await _context.UserAnswers.Where(a => guestSessionIds.Contains(a.SessionId)).ExecuteDeleteAsync();
                await _context.QuizSessions.Where(s => guestSessionIds.Contains(s.Id)).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} abandoned guest sessions: {SessionIds}",
                    guestSessionIds.Count, string.Join(", ", guestSessionIds));
            }

            if (realSessionIds.Count > 0)
            {
                // App-clock timestamp so EndTime/AbandonedAt stay consistent with the app-clock
                // StartTime. A bare DateTime.UtcNow inside ExecuteUpdate is evaluated on the DATABASE
                // clock, which drifts from the app clock and skews computed durations.
                var abandonedAt = DateTime.UtcNow;
                await _context.QuizSessions
                    .Where(s => realSessionIds.Contains(s.Id))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(x => x.IsCompleted, true)
                        .SetProperty(x => x.EndTime, abandonedAt)
                        .SetProperty(x => x.CurrentQuizQuestionId, (int?)null)
                        .SetProperty(x => x.CurrentQuestionStartTime, (DateTime?)null)
                        .SetProperty(x => x.AbandonmentReason, AbandonmentReason.Timeout)
                        .SetProperty(x => x.AbandonedAt, abandonedAt));

                _logger.LogInformation("Marked {Count} sessions as abandoned: {SessionIds}",
                    realSessionIds.Count, string.Join(", ", realSessionIds));
            }
        }
    }
}
