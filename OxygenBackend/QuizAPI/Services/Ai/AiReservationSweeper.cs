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
    /// Registered as a Hangfire recurring job in Program.cs, matching <c>ImageCleanUpService</c>.
    /// </summary>
    public sealed class AiReservationSweeper
    {
        private readonly IAiGenerationUsageRepository _usages;
        private readonly AiOptions _options;
        private readonly ILogger<AiReservationSweeper> _logger;

        public AiReservationSweeper(
            IAiGenerationUsageRepository usages,
            IOptions<AiOptions> options,
            ILogger<AiReservationSweeper> logger)
        {
            _usages = usages;
            _options = options.Value;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-Math.Max(1, _options.ReservationTimeoutMinutes));

            var released = await _usages.ReleaseStaleReservationsAsync(cutoff);
            if (released == 0) return;

            await _usages.SaveChangesAsync();
            _logger.LogInformation("Released {Count} abandoned AI generation reservation(s).", released);
        }
    }
}
