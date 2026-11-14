using Microsoft.Extensions.Options;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Releases quota reservations whose request never finished — the process was recycled, the
    /// connection dropped, the tab closed mid-generation. Without this a crash permanently costs
    /// the user a slot, and the bug is invisible until someone complains they have "4 of 5 left"
    /// forever.
    ///
    /// Registered as a Hangfire recurring job in Program.cs, like the other sweepers.
    /// </summary>
    public sealed class AiReservationSweeper
    {
        private readonly IAiGenerationUsageRepository _usages;
        private readonly Jobs.AiGenerationJobRunner _jobs;
        private readonly IAiGenerationJobRepository _jobRows;
        private readonly AiOptions _options;
        private readonly ILogger<AiReservationSweeper> _logger;

        public AiReservationSweeper(
            IAiGenerationUsageRepository usages,
            Jobs.AiGenerationJobRunner jobs,
            IAiGenerationJobRepository jobRows,
            IOptions<AiOptions> options,
            ILogger<AiReservationSweeper> logger)
        {
            _usages = usages;
            _jobs = jobs;
            _jobRows = jobRows;
            _options = options.Value;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-Math.Max(1, _options.ReservationTimeoutMinutes));

            var released = await _usages.ReleaseStaleReservationsAsync(cutoff);
            if (released > 0)
            {
                await _usages.SaveChangesAsync();
                _logger.LogInformation("Released {Count} abandoned AI generation reservation(s).", released);
            }

            // The same age means the same thing for a background job: whatever was running it is
            // gone. It ends as a failure the author can read, not as "Writing…" for ever.
            var ended = await _jobs.FailInterruptedAsync(cutoff);
            if (ended > 0)
                _logger.LogWarning("Ended {Count} AI generation job(s) that never finished.", ended);

            // And the ones long finished: a job row holds the questions and the source text.
            var deleted = await _jobRows.DeleteOlderThanAsync(
                DateTime.UtcNow.AddDays(-Math.Max(1, _options.JobRetentionDays)));
            if (deleted > 0)
            {
                await _jobRows.SaveChangesAsync();
                _logger.LogInformation("Deleted {Count} old AI generation job(s).", deleted);
            }
        }
    }
}
