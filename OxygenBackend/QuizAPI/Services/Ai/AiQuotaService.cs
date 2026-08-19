using Microsoft.Extensions.Options;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Reserve-then-commit quota accounting. See docs/quiz/ai-quiz-generation-flow.md §4.
    ///
    /// The daily window is <b>UTC midnight to UTC midnight</b>, deliberately: a window anchored
    /// to the user's local time is a moving target that a client could shift by lying about its
    /// timezone. The cost is that a user in UTC+13 sees their quota reset mid-afternoon; if that
    /// becomes a complaint, the fix is a rolling 24-hour window, not client-supplied offsets.
    /// </summary>
    public sealed class AiQuotaService : IAiQuotaService
    {
        private readonly IAiGenerationUsageRepository _usages;
        private readonly IAiQuotaPolicy _policy;
        private readonly AiOptions _options;
        private readonly ILogger<AiQuotaService> _logger;

        public AiQuotaService(
            IAiGenerationUsageRepository usages,
            IAiQuotaPolicy policy,
            IOptions<AiOptions> options,
            ILogger<AiQuotaService> logger)
        {
            _usages = usages;
            _policy = policy;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<AiQuotaReservation> TryReserveAsync(
            Guid userId, AiGenerationRequest request, string? requestHash, CancellationToken ct = default)
        {
            var limit = await _policy.GetDailyLimitAsync(userId, ct);
            var windowStart = WindowStart();
            var windowEnd = windowStart.AddDays(1);

            await using var transaction = await _usages.BeginTransactionAsync(ct);

            // Everything from here to COMMIT is serialised per user. Counting and inserting
            // outside one lock is the check-then-act race this whole method exists to close.
            //
            // Unlimited users still take the lock and still get a row: the row is how spend is
            // attributed, and the budget caps that actually protect the bill are computed from
            // it. Only the count check is skipped.
            await _usages.AcquireUserQuotaLockAsync(userId, ct);

            var used = await _usages.CountSlotsUsedSinceAsync(userId, windowStart, ct);
            if (limit is not null && used >= limit)
            {
                await transaction.RollbackAsync(ct);
                return new AiQuotaReservation(false, Guid.Empty, limit, 0, windowEnd);
            }

            var reservation = new AiGenerationUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = AiGenerationStatus.Reserved,
                Mode = request.Mode,
                Topic = request.Mode == AiGenerationMode.Topic ? Truncate(request.Topic, 200) : null,
                RequestHash = requestHash,
                SourceChars = request.SourceText?.Length ?? 0,
                QuestionsRequested = request.QuestionCount,
                CreatedAt = DateTime.UtcNow,
            };

            await _usages.AddAsync(reservation, ct);
            await _usages.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return new AiQuotaReservation(
                true, reservation.Id, limit, limit is null ? null : limit - used - 1, windowEnd);
        }

        public async Task CommitAsync(
            Guid reservationId, string model, AiTokenUsage usage, int questionsReturned, CancellationToken ct = default)
        {
            var row = await _usages.GetTrackedByIdAsync(reservationId, ct);
            if (row is null)
            {
                // The sweeper released it while the provider was working. The user still got their
                // quiz; we just can't bill the slot. Worth knowing about if it ever becomes common,
                // because it means the reservation timeout is shorter than real generations take.
                _logger.LogWarning("AI reservation {ReservationId} vanished before commit.", reservationId);
                return;
            }

            row.Status = AiGenerationStatus.Succeeded;
            row.Model = model;
            row.InputTokens = usage.InputTokens;
            row.OutputTokens = usage.OutputTokens;
            row.QuestionsReturned = questionsReturned;
            row.EstimatedCostUsd = EstimateCost(usage);
            row.CompletedAt = DateTime.UtcNow;

            await _usages.SaveChangesAsync(ct);
        }

        public async Task ReleaseAsync(Guid reservationId, string errorCode, CancellationToken ct = default)
        {
            var row = await _usages.GetTrackedByIdAsync(reservationId, ct);
            if (row is null) return;

            // Don't resurrect a row the sweeper already released, and never downgrade a commit.
            if (row.Status != AiGenerationStatus.Reserved) return;

            row.Status = AiGenerationStatus.Released;
            row.ErrorCode = errorCode;
            row.CompletedAt = DateTime.UtcNow;

            await _usages.SaveChangesAsync(ct);
        }

        public async Task<AiQuotaStatus> GetStatusAsync(Guid userId, CancellationToken ct = default)
        {
            var limit = await _policy.GetDailyLimitAsync(userId, ct);
            var windowStart = WindowStart();
            var used = await _usages.CountSlotsUsedSinceAsync(userId, windowStart, ct);

            return new AiQuotaStatus(
                limit,
                used,
                limit is null ? null : Math.Max(0, limit.Value - used),
                windowStart.AddDays(1));
        }

        /// <summary>
        /// Two ceilings, checked cheapest-window-first. The monthly cap bounds how much can be
        /// lost in total; the daily cap bounds how fast. Both matter: without the daily one, a
        /// runaway burns the whole month's budget in an afternoon and disables the feature for
        /// 30 days, which turns a small bill into a long outage.
        ///
        /// Note these are checked against <b>estimated</b> spend, priced at the cache-miss rate,
        /// so the figure runs ahead of the real bill rather than behind it. That is the safe
        /// direction, but it is not the last line of defence — a prepaid provider balance is.
        /// See docs/quiz/ai-quiz-generation-flow.md §7.
        /// </summary>
        public async Task<bool> IsOverBudgetAsync(CancellationToken ct = default)
        {
            if (_options.DailyBudgetUsd > 0)
            {
                var daily = await _usages.SumEstimatedCostSinceAsync(DateTime.UtcNow.AddDays(-1), ct);
                if (daily >= _options.DailyBudgetUsd)
                {
                    _logger.LogError(
                        "AI generation is over its daily budget: ${Spend} in the last 24h against a ${Budget} cap.",
                        daily, _options.DailyBudgetUsd);
                    return true;
                }
            }

            if (_options.MonthlyBudgetUsd <= 0) return false;

            var monthly = await _usages.SumEstimatedCostSinceAsync(DateTime.UtcNow.AddDays(-30), ct);
            if (monthly < _options.MonthlyBudgetUsd) return false;

            _logger.LogError(
                "AI generation is over its monthly budget: ${Spend} in the last 30 days against a ${Budget} cap.",
                monthly, _options.MonthlyBudgetUsd);
            return true;
        }

        /// <summary>
        /// Priced at the cache-miss input rate, so the figure is an upper bound on the real bill.
        /// Under-reporting spend would defeat the point of having a budget cap.
        /// </summary>
        private decimal EstimateCost(AiTokenUsage usage) =>
            (usage.InputTokens * _options.InputCostPerMillionUsd / 1_000_000m)
            + (usage.OutputTokens * _options.OutputCostPerMillionUsd / 1_000_000m);

        private static DateTime WindowStart() => DateTime.UtcNow.Date;

        private static string? Truncate(string? value, int max) =>
            value is null ? null : value.Length <= max ? value : value[..max];
    }
}
