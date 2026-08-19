using QuizAPI.Models.Ai;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Owns the reserve → commit / release lifecycle of a quota slot.
    /// See docs/quiz/ai-quiz-generation-flow.md §4 for the state machine.
    /// </summary>
    public interface IAiQuotaService
    {
        /// <summary>
        /// Takes a slot if one is free, inserting a <see cref="AiGenerationStatus.Reserved"/> row.
        /// Atomic with respect to concurrent requests from the same user.
        /// </summary>
        Task<AiQuotaReservation> TryReserveAsync(
            Guid userId, AiGenerationRequest request, string? requestHash, CancellationToken ct = default);

        /// <summary>Marks the reservation succeeded and prices it. The slot stays spent.</summary>
        Task CommitAsync(
            Guid reservationId, string model, AiTokenUsage usage, int questionsReturned, CancellationToken ct = default);

        /// <summary>
        /// Gives the slot back. Called for every failure the user can see — a generation that
        /// produced nothing must not cost them anything.
        /// </summary>
        Task ReleaseAsync(Guid reservationId, string errorCode, CancellationToken ct = default);

        /// <summary>How many generations the user has left today, without taking a slot.</summary>
        Task<AiQuotaStatus> GetStatusAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// True when rolling 30-day spend is at or over <c>Ai:MonthlyBudgetUsd</c>. Checked before
        /// reserving so a budget overrun degrades to "temporarily unavailable" rather than a bill.
        /// </summary>
        Task<bool> IsOverBudgetAsync(CancellationToken ct = default);
    }

    /// <param name="Succeeded">False when the daily cap is already spent.</param>
    /// <param name="ReservationId">The usage row to commit or release. Empty when not reserved.</param>
    /// <param name="Limit">The user's daily allowance, or null for unlimited (staff).</param>
    /// <param name="Remaining">Slots left after this reservation, or null when unlimited.</param>
    /// <param name="ResetsAtUtc">When the daily window rolls over.</param>
    public sealed record AiQuotaReservation(
        bool Succeeded, Guid ReservationId, int? Limit, int? Remaining, DateTime ResetsAtUtc);

    /// <param name="Limit">Daily allowance, or null for unlimited.</param>
    /// <param name="Used">Slots spent in the current window. Counted even when unlimited.</param>
    /// <param name="Remaining">Slots left, or null when unlimited.</param>
    public sealed record AiQuotaStatus(int? Limit, int Used, int? Remaining, DateTime ResetsAtUtc);
}
