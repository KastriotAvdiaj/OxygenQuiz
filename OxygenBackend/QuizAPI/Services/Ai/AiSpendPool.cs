namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Which budget a generation's cost counts against, decided by the plan the user was on when
    /// they reserved the slot (<c>AiGenerationUsage.PlanAtGeneration</c>). Two pools so free users
    /// exhausting theirs can't switch AI off for paying ones (docs/auth/paid-plans.md).
    /// </summary>
    public enum AiSpendPool
    {
        /// <summary>Free plan, staff, and the category-palette proposer: <c>Ai:DailyBudgetUsd</c> / <c>Ai:MonthlyBudgetUsd</c>.</summary>
        Free,
        /// <summary>Plus and Teacher: <c>Ai:PaidDailyBudgetUsd</c> / <c>Ai:PaidMonthlyBudgetUsd</c>.</summary>
        Paid,
    }
}
