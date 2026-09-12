namespace QuizAPI.Services.AccountClosure
{
    /// <summary>
    /// Self-service account closure: the person's own "delete my account", as distinct from the
    /// administrative deletion on <c>UserService.DeleteUserAsync</c>. See
    /// docs/adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md.
    ///
    /// <para>The two are deliberately different operations sharing one scrubbing routine. An admin
    /// removing a spam account and a person leaving are not the same event, do not deserve the same
    /// audit entry, and only one of them gets a grace period.</para>
    /// </summary>
    public interface IAccountClosureService
    {
        /// <summary>
        /// Schedules closure and returns the moment the account will be anonymised. Idempotent: a
        /// second request returns the date already set rather than restarting the clock, so a
        /// double-tap can't quietly buy another thirty days.
        /// </summary>
        Task<DateTime> RequestClosureAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// Cancels a pending closure. Returns true if one was pending — false is the ordinary answer
        /// for an account that was never closing, not an error, because this is called on every
        /// login and most logins have nothing to cancel.
        /// </summary>
        Task<bool> CancelClosureAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// Scrubs every account whose grace period has elapsed. Returns how many were anonymised.
        /// Entry point for the sweep; safe to call concurrently, since it only ever selects rows
        /// that still have <c>AnonymisedAt == null</c>.
        /// </summary>
        Task<int> AnonymisePendingAsync(CancellationToken ct = default);
    }
}
