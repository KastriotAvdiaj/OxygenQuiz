namespace QuizAPI.Models.Billing
{
    /// <summary>
    /// One Paddle webhook delivery, kept for idempotency and audit (docs/auth/paid-plans.md §5.5).
    ///
    /// <para><b><see cref="EventId"/> is Paddle's own event id and the primary key.</b> A delivery is
    /// a duplicate only once <see cref="ProcessedAt"/> is set — a row that exists but failed to sync
    /// is not "already handled", so Paddle's retry of the same id is allowed to try again.</para>
    /// </summary>
    public class BillingWebhookEvent
    {
        public string EventId { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;
        public DateTime OccurredAt { get; set; }
        public DateTime ReceivedAt { get; set; }

        /// <summary>Null until the subscription sync for this event completes. Drives the retry rule.</summary>
        public DateTime? ProcessedAt { get; set; }

        /// <summary>The last sync failure's message, if any. Overwritten on each retry attempt.</summary>
        public string? Error { get; set; }
    }
}
