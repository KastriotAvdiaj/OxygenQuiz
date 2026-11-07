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
    /// SuperAdmins have no daily cap; Admins and Teachers get <c>Ai:DefaultDailyQuota</c>; anyone
    /// else gets none (since 2026-11-07 — before that every player had the default and Admins were
    /// uncapped too).
    ///
    /// <para>Zero for a plain player is the second lock, not the first: the AI endpoints already
    /// refuse them by role (<see cref="Roles.RoleRules.AiRoles"/>). It keeps a role mix-up, or a
    /// caller that reaches generation another way, from spending.</para>
    ///
    /// <para>Replace, don't extend, when paid plans land.</para>
    /// </summary>
    public sealed class ConfigAiQuotaPolicy : IAiQuotaPolicy
    {
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
            var roles = user?.UserRoles
                .Where(ur => ur.Role is not null)
                .Select(ur => ur.Role!.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase)
                ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (roles.Contains(Roles.RoleRules.SuperAdmin)) return null;
            if (roles.Contains(Roles.RoleRules.Admin) || roles.Contains(Roles.RoleRules.Teacher))
                return Math.Max(0, _options.DefaultDailyQuota);
            return 0;
        }
    }
}
