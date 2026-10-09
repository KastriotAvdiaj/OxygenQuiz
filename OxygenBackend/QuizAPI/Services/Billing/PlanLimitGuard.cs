using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// The "may this user create one more?" checks for the count-based plan limits, in one place so
    /// every entry point refuses the same way (docs/auth/paid-plans.md, "Where each limit is
    /// enforced"). Each method is called <em>before</em> anything is written.
    ///
    /// <para><b>Only creation is refused.</b> A user over a limit — because their plan lapsed, or a
    /// limit was lowered — keeps, edits and plays everything they have (docs/adr/0026).</para>
    /// </summary>
    public interface IPlanLimitGuard
    {
        /// <summary>Throws <see cref="PlanLimitException"/> when the user already owns their plan's maximum of quizzes.</summary>
        Task EnsureCanCreateQuizAsync(Guid userId, CancellationToken ct = default);

        /// <summary>Throws <see cref="PlanLimitException"/> when the host already keeps their plan's maximum of Classes.</summary>
        Task EnsureCanCreateClassAsync(Guid userId, CancellationToken ct = default);
    }

    public sealed class PlanLimitGuard : IPlanLimitGuard
    {
        private readonly IEntitlementService _entitlements;
        private readonly IQuizRepository _quizzes;
        private readonly IClassRepository _classes;

        public PlanLimitGuard(IEntitlementService entitlements, IQuizRepository quizzes, IClassRepository classes)
        {
            _entitlements = entitlements;
            _quizzes = quizzes;
            _classes = classes;
        }

        public async Task EnsureCanCreateQuizAsync(Guid userId, CancellationToken ct = default)
        {
            // Unlimited costs no query — the common case while Free has no quiz cap.
            if ((await _entitlements.GetAsync(userId, ct)).MaxOwnedQuizzes is not int max) return;
            if (await _quizzes.CountOwnedAsync(userId, ct) < max) return;

            throw Refusal(PlanLimits.Quizzes, max, e => e.MaxOwnedQuizzes,
                $"Your plan allows {max} quizzes. Delete one, or upgrade to make more.");
        }

        public async Task EnsureCanCreateClassAsync(Guid userId, CancellationToken ct = default)
        {
            if ((await _entitlements.GetAsync(userId, ct)).MaxClasses is not int max) return;
            if (await _classes.CountAsync(userId, ct) < max) return;

            throw Refusal(PlanLimits.Classes, max, e => e.MaxClasses,
                max == 1
                    ? "Your plan includes one class. Upgrade to Teacher to keep more."
                    : $"Your plan includes {max} classes. Upgrade to keep more.");
        }

        private static PlanLimitException Refusal(string limit, int max, Func<Entitlements, int?> select, string message) =>
            new(message, limit, max, PlanCatalog.CheapestAbove(select, max) is PlanTier tier ? tier.ToString() : null);
    }
}
