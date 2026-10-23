using Microsoft.Extensions.Options;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Roles;

namespace QuizAPI.Services.Media
{
    /// <summary>
    /// How much media an account may save. Its own seam for the same reason as
    /// <c>IAiQuotaPolicy</c>: quota is a commercial property, and when paid tiers are merged the
    /// change is a second implementation reading the subscription — no caller touched.
    /// </summary>
    public interface IMediaQuotaPolicy
    {
        Task<MediaQuota> GetQuotaAsync(Guid userId, CancellationToken ct = default);
    }

    /// <summary>
    /// By role until tiers land (docs/media/media-pipeline.md, "Every signed-in user may upload"):
    /// User gets <c>Media:UserQuota</c>, Teacher and Admin get <c>Media:StaffQuota</c>, SuperAdmin
    /// is unlimited. Read from the account's stored roles, not the request principal, so the answer
    /// is about the user id it was given.
    /// </summary>
    public sealed class RoleMediaQuotaPolicy(IOptions<MediaOptions> options, IUserRepository users) : IMediaQuotaPolicy
    {
        private static readonly MediaQuota Unlimited = new() { DailyNew = null, StorageBytes = null };

        public async Task<MediaQuota> GetQuotaAsync(Guid userId, CancellationToken ct = default)
        {
            var user = await users.GetByIdAsync(userId, tracked: false, ct);
            var roles = user?.UserRoles
                .Where(ur => ur.Role is not null)
                .Select(ur => ur.Role!.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase) ?? new HashSet<string>();

            if (roles.Contains(RoleRules.SuperAdmin)) return Unlimited;
            if (roles.Contains(RoleRules.Admin) || roles.Contains(RoleRules.Teacher)) return options.Value.StaffQuota;
            return options.Value.UserQuota;
        }
    }
}
