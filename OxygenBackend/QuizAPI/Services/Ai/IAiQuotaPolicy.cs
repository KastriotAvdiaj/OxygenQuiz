using Microsoft.Extensions.Options;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// How many generations a user gets per day. Exists as its own seam because quota is a
    /// <b>commercial</b> property, not a permission — when paid plans arrive (plan §9.4) the
    /// change is a second implementation reading a subscription, with no caller and no schema
    /// touched. Modelling it as a role would put a pricing decision in the permissions system,
    /// where it does not belong.
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

    /// <summary>
    /// Everyone gets <c>Ai:DefaultDailyQuota</c>; staff get no daily cap.
    ///
    /// <para>Replace, don't extend, when paid plans land.</para>
    /// </summary>
    public sealed class ConfigAiQuotaPolicy : IAiQuotaPolicy
    {
        /// <summary>
        /// Roles exempt from the daily count. Matches the Admin-or-SuperAdmin notion used
        /// everywhere else in the codebase (<c>ICurrentUserService.IsAdmin</c>) rather than
        /// inventing a third definition of "staff".
        /// </summary>
        private static readonly HashSet<string> UnlimitedRoles =
            new(StringComparer.OrdinalIgnoreCase) { "Admin", "SuperAdmin" };

        private readonly AiOptions _options;
        private readonly IUserRepository _users;

        public ConfigAiQuotaPolicy(IOptions<AiOptions> options, IUserRepository users)
        {
            _options = options.Value;
            _users = users;
        }

        public async Task<int?> GetDailyLimitAsync(Guid userId, CancellationToken ct = default)
        {
            // Resolved from the user's stored roles rather than the request principal, so the
            // answer doesn't depend on who happens to be calling — the signature takes a userId
            // and should mean it. GetByIdAsync already includes roles.
            var user = await _users.GetByIdAsync(userId, tracked: false, ct);

            var isStaff = user?.UserRoles
                .Any(ur => ur.Role is not null && UnlimitedRoles.Contains(ur.Role.Name)) == true;

            return isStaff ? null : Math.Max(0, _options.DefaultDailyQuota);
        }
    }
}
