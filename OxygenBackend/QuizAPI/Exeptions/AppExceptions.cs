namespace QuizAPI.Exceptions
{
    public abstract class AppException(string message) : Exception(message)
    {
    }

    public class NotFoundException(string message) : AppException(message)
    {
    }

    public class ConflictException(string message) : AppException(message)
    {
    }

    public sealed class UnauthorizedException(string message) : AppException(message)
    {
    }

    public sealed class AppValidationException(string message) : AppException(message)
    {
    }

    /// <summary>The caller is authenticated but not allowed to perform this specific action
    /// (e.g. an Admin trying to grant the SuperAdmin role). Maps to HTTP 403.</summary>
    public sealed class ForbiddenException(string message) : AppException(message)
    {
    }

    /// <summary>
    /// A plan limit was reached — the action is allowed, just not this many of it on the caller's
    /// plan (docs/auth/paid-plans.md). Maps to HTTP 403 with <c>code: "PlanLimitReached"</c>, the
    /// limit, and the cheapest plan that lifts it, so the client shows one upgrade prompt for every
    /// endpoint that throws this.
    /// </summary>
    /// <param name="limit">Which limit — one of <see cref="PlanLimits"/>.</param>
    /// <param name="max">The caller's current limit.</param>
    /// <param name="upgradeTo">The cheapest plan with a higher limit, or null when none has one.</param>
    public sealed class PlanLimitException(string message, string limit, int max, string? upgradeTo)
        : AppException(message)
    {
        public string Limit { get; } = limit;
        public int Max { get; } = max;
        public string? UpgradeTo { get; } = upgradeTo;
    }

    /// <summary>The names <see cref="PlanLimitException.Limit"/> takes. Mirrored in the client's plan-limit notice.</summary>
    public static class PlanLimits
    {
        public const string Quizzes = "quizzes";
        public const string Classes = "classes";
    }

    /// <summary>
    /// Billing is disabled or misconfigured (<c>Billing:Enabled = false</c>, per ADR 0004 "a
    /// misconfigured provider turns the feature off, not crash"). The pricing page already hides
    /// checkout behind <c>PlanCatalogDTO.CheckoutAvailable</c>, so this only guards a caller that
    /// reaches <c>/api/billing</c> anyway. Maps to HTTP 503.
    /// </summary>
    public sealed class BillingUnavailableException(string message) : AppException(message)
    {
    }

    /// <summary>Paddle's API returned something other than success. Maps to HTTP 502 — the failure is upstream, not ours.</summary>
    public sealed class BillingProviderException(string message) : AppException(message)
    {
    }
}
