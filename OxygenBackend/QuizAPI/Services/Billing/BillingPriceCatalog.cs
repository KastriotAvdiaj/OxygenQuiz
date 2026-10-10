using QuizAPI.Models.Billing;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// The one place <c>(PlanTier, BillingInterval)</c> maps to a configured Paddle price id and
    /// back. Used by <see cref="Controllers.Billing.BillingController"/> to resolve a checkout's
    /// price id, and by both <see cref="IBillingProvider"/> implementations to resolve a
    /// subscription's plan from its price id — one mapping, never duplicated.
    /// </summary>
    public static class BillingPriceCatalog
    {
        public static string GetPriceId(BillingPriceOptions prices, PlanTier plan, BillingInterval interval) =>
            (plan, interval) switch
            {
                (PlanTier.Plus, BillingInterval.Month) => prices.PlusMonthly,
                (PlanTier.Plus, BillingInterval.Year) => prices.PlusYearly,
                (PlanTier.Teacher, BillingInterval.Month) => prices.TeacherMonthly,
                (PlanTier.Teacher, BillingInterval.Year) => prices.TeacherYearly,
                _ => throw new Exceptions.AppValidationException($"There is no price for {plan}/{interval}."),
            };

        public static bool TryResolve(BillingPriceOptions prices, string priceId, out PlanTier plan, out BillingInterval interval)
        {
            if (priceId == prices.PlusMonthly) { plan = PlanTier.Plus; interval = BillingInterval.Month; return true; }
            if (priceId == prices.PlusYearly) { plan = PlanTier.Plus; interval = BillingInterval.Year; return true; }
            if (priceId == prices.TeacherMonthly) { plan = PlanTier.Teacher; interval = BillingInterval.Month; return true; }
            if (priceId == prices.TeacherYearly) { plan = PlanTier.Teacher; interval = BillingInterval.Year; return true; }
            plan = PlanTier.Free;
            interval = BillingInterval.None;
            return false;
        }
    }
}
