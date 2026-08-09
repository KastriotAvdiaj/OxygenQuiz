using Microsoft.Extensions.Options;

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
        Task<int> GetDailyLimitAsync(Guid userId, CancellationToken ct = default);
    }

    /// <summary>Everyone gets <c>Ai:DefaultDailyQuota</c>. Replace, don't extend, when plans land.</summary>
    public sealed class ConfigAiQuotaPolicy : IAiQuotaPolicy
    {
        private readonly AiOptions _options;

        public ConfigAiQuotaPolicy(IOptions<AiOptions> options) => _options = options.Value;

        public Task<int> GetDailyLimitAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Math.Max(0, _options.DefaultDailyQuota));
    }
}
