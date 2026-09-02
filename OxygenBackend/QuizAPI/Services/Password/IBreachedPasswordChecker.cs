namespace QuizAPI.Services.Password
{
    /// <summary>
    /// Screens a password against a corpus of passwords known to have appeared in breaches.
    ///
    /// <para><b>Why this is a service and not another validation attribute.</b>
    /// <c>NotACommonPasswordAttribute</c> covers the same ground with a 78-entry embedded list, and
    /// the obvious tidy-up is to merge the two. It cannot be done: DataAnnotations validation is
    /// synchronous, and this check makes an HTTP call. Blocking on it inside an attribute would
    /// mean sync-over-async on every signup. So the local list stays where it is — cheap, offline,
    /// always available — and this runs afterwards in the service layer, where awaiting is normal.
    /// Two checks, deliberately, and neither is redundant: see docs/auth/password-policy.md.</para>
    /// </summary>
    public interface IBreachedPasswordChecker
    {
        /// <summary>
        /// True when the password is known to be breached. <b>False also means "could not tell"</b>
        /// — implementations fail open, so a provider outage degrades the policy to the local list
        /// rather than blocking every signup and password reset in the application.
        /// </summary>
        Task<bool> IsBreachedAsync(string password, CancellationToken ct = default);
    }

    /// <summary>Used when the check is switched off. Answers "not breached" to everything.</summary>
    public sealed class NullBreachedPasswordChecker : IBreachedPasswordChecker
    {
        public Task<bool> IsBreachedAsync(string password, CancellationToken ct = default) =>
            Task.FromResult(false);
    }
}
