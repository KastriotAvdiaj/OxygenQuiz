using QuizAPI.Services.AccountClosure;

namespace QuizAPI.Services
{
    /// <summary>
    /// Scrubs accounts whose closure grace period has elapsed
    /// (docs/adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md).
    ///
    /// <para>A wrapper over <see cref="IAccountClosureService.AnonymisePendingAsync"/>, deliberately
    /// thin, for the reason <see cref="AbandonedSessionSweeper"/> spells out at length: the previous
    /// background job in this codebase carried its own copy of the rules and had drifted from the
    /// service that answered the same question on the request path.</para>
    ///
    /// <para><b>The sweep is what makes the promise true.</b> Nothing else anonymises: a closure that
    /// is never swept is an account that told its owner their data was going and then kept it. That
    /// is a worse failure than not offering closure at all, so this job silently not running is the
    /// thing to check first if closure ever looks wrong — exactly how abandonment was broken for
    /// months by a BackgroundService nobody had registered.</para>
    ///
    /// Registered as a Hangfire recurring job in Program.cs, hourly. Hourly rather than every five
    /// minutes because the deadline is thirty days away: being an hour late is unmeasurable, and the
    /// work per run is heavier than a session sweep.
    /// </summary>
    public sealed class AccountAnonymisationSweeper
    {
        private readonly IAccountClosureService _closure;
        private readonly ILogger<AccountAnonymisationSweeper> _logger;

        public AccountAnonymisationSweeper(
            IAccountClosureService closure,
            ILogger<AccountAnonymisationSweeper> logger)
        {
            _closure = closure;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            try
            {
                await _closure.AnonymisePendingAsync();
            }
            catch (Exception ex)
            {
                // Log, then rethrow so Hangfire records the failure and retries. The log line is
                // the part that matters: in Production the dashboard is not mapped, so a failed job
                // is otherwise invisible — and a silently non-running sweep is exactly the failure
                // mode that left abandonment broken for months. The count of accounts actually
                // scrubbed is logged by the service on success.
                _logger.LogError(ex, "Account anonymisation sweep failed.");
                throw;
            }
        }
    }
}
