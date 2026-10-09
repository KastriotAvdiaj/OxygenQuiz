namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// How many generations a user gets per day. Exists as its own seam because quota is a
    /// <b>commercial</b> property, not a permission. Since paid plans (docs/auth/paid-plans.md)
    /// the one implementation is <see cref="EntitlementAiQuotaPolicy"/>, which reads the user's
    /// plan — it replaced the original config-only policy without touching a caller or the usage
    /// table, which is what this seam was for. Modelling quota as a role would have put a pricing
    /// decision in the permissions system, where it does not belong.
    /// </summary>
    public interface IAiQuotaPolicy
    {
        /// <summary>
        /// The user's daily allowance, or <c>null</c> for unlimited.
        ///
        /// <para><b>Null means the daily count is skipped, not that spending is.</b> The
        /// rolling budget caps still apply to everyone — they are what stands between a runaway
        /// loop and the bill, and exempting anyone from them would defeat the point of having
        /// them. Usage rows are still written either way, so cost stays attributable.</para>
        /// </summary>
        Task<int?> GetDailyLimitAsync(Guid userId, CancellationToken ct = default);
    }
}
