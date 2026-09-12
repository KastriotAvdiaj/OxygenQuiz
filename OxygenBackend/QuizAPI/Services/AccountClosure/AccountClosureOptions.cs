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
        /// Most a single sweep will anonymise. A cap rather than a target: the sweep runs hourly and
        /// a backlog drains over the following hours, which is preferable to one pass holding a
        /// transaction open across thousands of rows.
        /// </summary>
        public int SweepBatchSize { get; set; } = 200;
    }
}
