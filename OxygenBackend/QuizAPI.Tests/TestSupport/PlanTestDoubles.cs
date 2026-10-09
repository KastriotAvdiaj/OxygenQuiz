using QuizAPI.Models.Billing;
using QuizAPI.Services.Billing;

namespace QuizAPI.Tests.TestSupport;

/// <summary>
/// A plan-limit guard that never refuses — for tests about something other than plan limits.
/// The limits themselves are covered in Billing/PlanLimitGuardTests.
/// </summary>
internal sealed class NoPlanLimits : IPlanLimitGuard
{
    public static readonly NoPlanLimits Instance = new();

    public Task EnsureCanCreateQuizAsync(Guid userId, CancellationToken ct = default) => Task.CompletedTask;
    public Task EnsureCanCreateClassAsync(Guid userId, CancellationToken ct = default) => Task.CompletedTask;
}

/// <summary>Every user gets the same entitlements — Free by default.</summary>
internal sealed class FixedEntitlements : IEntitlementService
{
    public Entitlements Value { get; set; }

    public FixedEntitlements(PlanTier plan = PlanTier.Free, int freeAiDailyGenerations = 2) =>
        Value = PlanCatalog.For(plan, freeAiDailyGenerations);

    public FixedEntitlements(Entitlements value) => Value = value;

    public Task<Entitlements> GetAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(Value);
    public void Evict(Guid userId) { }
}
