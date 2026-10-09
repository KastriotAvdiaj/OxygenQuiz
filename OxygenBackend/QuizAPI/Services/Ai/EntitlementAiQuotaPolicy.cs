using QuizAPI.Services.Billing;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// The daily AI allowance is the user's plan's (docs/auth/paid-plans.md). This replaced
    /// <c>ConfigAiQuotaPolicy</c>, exactly as <see cref="IAiQuotaPolicy"/> anticipated: no caller and
    /// no schema changed. Staff still get <c>null</c> — no daily count — and Free still gets
    /// <c>Ai:DefaultDailyQuota</c>; both now come from <see cref="PlanCatalog"/>.
    /// </summary>
    public sealed class EntitlementAiQuotaPolicy : IAiQuotaPolicy
    {
        private readonly IEntitlementService _entitlements;

        public EntitlementAiQuotaPolicy(IEntitlementService entitlements) => _entitlements = entitlements;

        public async Task<int?> GetDailyLimitAsync(Guid userId, CancellationToken ct = default) =>
            (await _entitlements.GetAsync(userId, ct)).AiDailyGenerations;
    }
}
