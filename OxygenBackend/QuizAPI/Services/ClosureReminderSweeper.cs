using QuizAPI.Services.AccountClosure;

namespace QuizAPI.Services
{
    /// <summary>
    /// Warns people a few days before their closed account is scrubbed
    /// (docs/adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md).
    ///
    /// <para>Thin over <see cref="IAccountClosureService.SendClosureRemindersAsync"/>, for the reason
    /// <see cref="AbandonedSessionSweeper"/> spells out: a background job that carries its own copy of
    /// the rules drifts from the service answering the same question elsewhere.</para>
    ///
    /// <para><b>Separate from the anonymisation sweep on purpose.</b> They read the same rows and it
    /// is tempting to do both in one pass, but they fail differently: anonymisation touches only our
    /// own database, while this one depends on an email provider that can be down, throttled or
    /// misconfigured. Sharing a job would let a mail outage take the scrub down with it — and the
    /// scrub is the promise. Separate jobs also mean the reminder's failures are legible in the
    /// Hangfire history as the reminder's failures.</para>
    ///
    /// Registered as a Hangfire recurring job in Program.cs, hourly.
    /// </summary>
    public sealed class ClosureReminderSweeper
    {
        private readonly IAccountClosureService _closure;
        private readonly ILogger<ClosureReminderSweeper> _logger;

        public ClosureReminderSweeper(
            IAccountClosureService closure,
            ILogger<ClosureReminderSweeper> logger)
        {
            _closure = closure;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            try
            {
                await _closure.SendClosureRemindersAsync();
            }
            catch (Exception ex)
            {
                // Log, then rethrow so Hangfire records the failure and retries. A single bad
                // address does NOT reach here — the service swallows those per-user so one
                // undeliverable mail can't cost everyone behind it in the batch their warning.
                // Anything that does reach here is the whole sweep failing.
                _logger.LogError(ex, "Account closure reminder sweep failed.");
                throw;
            }
        }
    }
}
