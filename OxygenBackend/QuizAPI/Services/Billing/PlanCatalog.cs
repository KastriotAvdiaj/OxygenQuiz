using QuizAPI.Models.Billing;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// What each plan gets, in one place. The numbers are product decisions with tests, which is
    /// why they live in code rather than config: a typo here fails a test, a typo in an
    /// environment variable silently gives everyone a different product. Prices are display
    /// prices only — what is actually charged will be the payment provider's
    /// (docs/auth/paid-plans.md).
    ///
    /// <para><b>Changing a limit changes a promise.</b> The pricing page renders this catalogue,
    /// so raising a number is fine; lowering one takes something away from people who paid for
    /// it. A downgrade never deletes (docs/adr/0026): lowering a cap only stops new things being
    /// created over it.</para>
    /// </summary>
    public static class PlanCatalog
    {
        /// <summary>
        /// Lobby size for everyone who isn't on a paid plan — the size the create dialog offered
        /// before plans existed. Free keeps everything it had.
        /// </summary>
        public const int FreeLobbyPlayers = 10;

        public const int MinLobbyPlayers = 2;

        /// <summary>
        /// The limits of a tier. <paramref name="freeAiDailyGenerations"/> is
        /// <c>Ai:DefaultDailyQuota</c>: Free's AI allowance was a documented config knob before
        /// plans existed, and it stays one so turning it down in an incident needs no deploy.
        /// </summary>
        public static Entitlements For(PlanTier tier, int freeAiDailyGenerations) => tier switch
        {
            PlanTier.Plus => new Entitlements(
                Plan: PlanTier.Plus,
                IsStaff: false,
                AiDailyGenerations: 10,
                MaxOwnedQuizzes: null,
                MaxLobbyPlayers: 20,
                MaxClasses: 1),

            PlanTier.Teacher => new Entitlements(
                Plan: PlanTier.Teacher,
                IsStaff: false,
                AiDailyGenerations: 15,
                MaxOwnedQuizzes: null,
                MaxLobbyPlayers: 40,
                MaxClasses: null),

            // No quiz cap: decided 2026-10-10. The mechanism is in place (QuizOwnershipLimit) so
            // a cap is this one number, not a feature.
            _ => new Entitlements(
                Plan: PlanTier.Free,
                IsStaff: false,
                AiDailyGenerations: Math.Max(0, freeAiDailyGenerations),
                MaxOwnedQuizzes: null,
                MaxLobbyPlayers: FreeLobbyPlayers,
                MaxClasses: 1),
        };

        /// <summary>
        /// Staff are not customers: they get the highest limits of any plan and no daily AI count,
        /// while keeping whatever plan they actually hold for display. The AI budget caps still
        /// apply to them — they are what protects the bill (ai-quiz-generation-flow.md §4a).
        /// </summary>
        public static Entitlements ForStaff(PlanTier actualPlan, int freeAiDailyGenerations)
        {
            var top = For(PlanTier.Teacher, freeAiDailyGenerations);
            return top with
            {
                Plan = actualPlan,
                IsStaff = true,
                AiDailyGenerations = null,
            };
        }

        /// <summary>
        /// The cheapest paid tier whose <paramref name="limit"/> is above <paramref name="current"/>
        /// (null meaning unlimited), or null when no plan offers more. What a plan-limit refusal
        /// names as the way out.
        /// </summary>
        public static PlanTier? CheapestAbove(Func<Entitlements, int?> limit, int current)
        {
            foreach (var tier in new[] { PlanTier.Plus, PlanTier.Teacher })
            {
                var value = limit(For(tier, freeAiDailyGenerations: 0));
                if (value is null || value > current) return tier;
            }
            return null;
        }

        /// <summary>A paid tier as the pricing page shows it.</summary>
        public sealed record PaidPlan(PlanTier Tier, string Name, decimal MonthlyEur, decimal YearlyEur);

        /// <summary>
        /// Display prices in EUR, decided 2026-10-07. Not what is charged: once checkout exists,
        /// the provider's price objects are the truth and these become the fallback copy.
        /// </summary>
        public static readonly IReadOnlyList<PaidPlan> PaidPlans = new[]
        {
            new PaidPlan(PlanTier.Plus, "Plus", MonthlyEur: 3.99m, YearlyEur: 29m),
            new PaidPlan(PlanTier.Teacher, "Teacher", MonthlyEur: 6.99m, YearlyEur: 49m),
        };
    }
}
