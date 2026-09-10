using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;

namespace QuizAPI.Services
{
    /// <summary>
    /// Ends quiz sessions nobody is coming back to: the tab was closed mid-question, the phone
    /// went flat, the player wandered off. Marks real-account sessions abandoned and deletes
    /// guest ones, via <see cref="ISessionAbandonmentService.CleanupAbandonedSessionsAsync"/>.
    ///
    /// <para><b>Nothing did this until 2026-09-10.</b> A <c>QuizSessionCleanupService :
    /// BackgroundService</c> existed, complete with its own copy of the timeout maths, and was
    /// never passed to <c>AddHostedService</c> — there is no such call anywhere in the project,
    /// because recurring work here goes through Hangfire. So it had never run once. Abandonment
    /// happened only when a user happened to touch the session, which meant:</para>
    /// <list type="bullet">
    ///   <item>stale sessions accumulated forever, and with
    ///   <c>MaxConcurrentSessionsPerUser = 1</c> each one blocked that player from restarting
    ///   that quiz until they resumed or abandoned it by hand;</item>
    ///   <item>abandoned <b>guest</b> sessions were never deleted, contradicting the guarantee
    ///   docs/auth/guest-play.md makes about them — the rows and their answers simply stayed;</item>
    ///   <item>the one code path that did clean up lazily was the resume path, which threw an
    ///   NRE while doing it (see <c>BuildCompletedResultAsync</c>). The only working cleanup was
    ///   an admin endpoint nobody calls.</item>
    /// </list>
    ///
    /// <para><b>This is a wrapper, not a second implementation.</b> That is the point: the
    /// deleted background service had diverged already — hardcoded thresholds instead of
    /// <c>QuizSessionOptions</c>, and it set neither <c>AbandonmentReason</c> nor
    /// <c>AbandonedAt</c> nor deleted guest rows. One set of rules, in the service that also
    /// answers "is this session abandoned?" on the resume path, is what keeps a swept session and
    /// a refused resume telling the player the same story.</para>
    ///
    /// Registered as a Hangfire recurring job in Program.cs, matching <c>AiReservationSweeper</c>.
    /// </summary>
    public sealed class AbandonedSessionSweeper
    {
        private readonly ISessionAbandonmentService _abandonment;
        private readonly ILogger<AbandonedSessionSweeper> _logger;

        public AbandonedSessionSweeper(
            ISessionAbandonmentService abandonment,
            ILogger<AbandonedSessionSweeper> logger)
        {
            _abandonment = abandonment;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var swept = await _abandonment.CleanupAbandonedSessionsAsync();

            // Quiet when there is nothing to do — this runs every five minutes, and a log line
            // per sweep would bury the ones that matter.
            if (swept > 0)
            {
                _logger.LogInformation("Swept {Count} abandoned quiz session(s).", swept);
            }
        }
    }
}
