namespace QuizAPI.Services.AccountClosure
{
    /// <summary>
    /// Knobs for self-service account closure
    /// (docs/adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md).
    /// </summary>
    public class AccountClosureOptions
    {
        public const string SectionName = "AccountClosure";

        /// <summary>
        /// How long a closed account stays recoverable before its personal data is scrubbed.
        ///
        /// <para>Thirty days is the convention people already expect, and the length is doing real
        /// work: the whole reason closure is reversible at all is that the recovery cost of a
        /// mistaken deletion is total. Shortening it is a product decision, not a tuning one.</para>
        /// </summary>
        public int GracePeriodDays { get; set; } = 30;

        /// <summary>
        /// Most a single sweep will anonymise, and most reminder emails one sweep will send. A cap
        /// rather than a target: the sweeps run hourly and a backlog drains over the following
        /// hours, which is preferable to one pass holding a transaction open across thousands of
        /// rows — or firing thousands of emails at a provider's rate limit.
        /// </summary>
        public int SweepBatchSize { get; set; } = 200;

        /// <summary>
        /// How many days before the scrub the warning email goes out. Three, because the mail has to
        /// arrive while there is still time to act on it and while the decision is far enough behind
        /// the person that they may have forgotten it — a day is easy to miss, a week still feels
        /// like "later".
        ///
        /// <para>Set it to 0 (or to anything at or above <see cref="GracePeriodDays"/>) to turn the
        /// reminder off: a warning sent after the data is gone is not a warning, so the sweep
        /// refuses rather than sending one late.</para>
        /// </summary>
        public int ReminderDaysBefore { get; set; } = 3;
    }
}
