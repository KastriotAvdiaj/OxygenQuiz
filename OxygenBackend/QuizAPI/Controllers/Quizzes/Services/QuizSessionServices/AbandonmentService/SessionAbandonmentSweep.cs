using Microsoft.Extensions.Options;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService
{
    /// <summary>
    /// Periodically marks stale quiz sessions as abandoned.
    ///
    /// <para>
    /// Abandonment was previously only ever <b>lazy</b>: a session was recognised as abandoned
    /// when the same player came back to that quiz (<see cref="ISessionAbandonmentService
    /// .GetActiveSessionForUserAsync"/>), on resume, or when an admin hit the manual cleanup
    /// endpoint. A player who simply never returned left a row sitting at
    /// <c>IsCompleted = false</c> forever — counted as neither completed nor abandoned, which
    /// is precisely the population the quiz analytics' completion rate is computed against.
    /// </para>
    ///
    /// <para>
    /// A <c>QuizSessionCleanupService</c> existed for this and <b>was never registered</b>, so it
    /// had never run. It has been deleted rather than wired up: it was a stale fork of the logic
    /// that predated <see cref="AbandonmentReason"/> and guest sessions, so it neither stamped
    /// <c>AbandonmentReason</c>/<c>AbandonedAt</c> nor deleted guest rows — turning it on would
    /// have quietly produced a second, wrong kind of abandoned session. This class owns the
    /// schedule and nothing else; the rules stay in <see cref="ISessionAbandonmentService"/>,
    /// which the lazy paths and the admin endpoint already share.
    /// </para>
    /// </summary>
    public class SessionAbandonmentSweep : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<SessionAbandonmentSweep> _logger;
        private readonly TimeSpan _interval;

        public SessionAbandonmentSweep(
            IServiceProvider services,
            ILogger<SessionAbandonmentSweep> logger,
            IOptions<QuizSessionOptions> options)
        {
            _services = services;
            _logger = logger;
            _interval = TimeSpan.FromMinutes(options.Value.AbandonmentSweepMinutes);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (_interval <= TimeSpan.Zero)
            {
                _logger.LogInformation(
                    "Session abandonment sweep disabled (AbandonmentSweepMinutes <= 0).");
                return;
            }

            _logger.LogInformation(
                "Session abandonment sweep started; running every {Interval}.", _interval);

            // PeriodicTimer rather than Task.Delay in a loop: it does not drift with the time each
            // pass takes, and it observes cancellation without throwing on shutdown.
            using var timer = new PeriodicTimer(_interval);

            while (await SafeWaitAsync(timer, stoppingToken))
            {
                try
                {
                    // The abandonment service is scoped (it holds a DbContext), so each pass gets
                    // its own scope. Resolving it once in the constructor would capture a context
                    // for the lifetime of the process.
                    using var scope = _services.CreateScope();
                    var abandonment = scope.ServiceProvider
                        .GetRequiredService<ISessionAbandonmentService>();

                    var count = await abandonment.CleanupAbandonedSessionsAsync();
                    if (count > 0)
                    {
                        _logger.LogInformation(
                            "Abandonment sweep marked {Count} session(s).", count);
                    }
                }
                catch (Exception ex)
                {
                    // One bad pass must not kill the service — the next tick tries again. A sweep
                    // that dies silently is worse than the problem it was added to fix.
                    _logger.LogError(ex, "Session abandonment sweep failed; will retry next tick.");
                }
            }

            _logger.LogInformation("Session abandonment sweep stopped.");
        }

        /// <summary>Waits for the next tick, returning false when shutdown was requested.</summary>
        private static async Task<bool> SafeWaitAsync(PeriodicTimer timer, CancellationToken ct)
        {
            try
            {
                return await timer.WaitForNextTickAsync(ct);
            }
            catch (OperationCanceledException)
            {
                return false;
            }
        }
    }
}
