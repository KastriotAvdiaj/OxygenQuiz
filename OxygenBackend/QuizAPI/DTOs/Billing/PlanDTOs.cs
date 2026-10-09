namespace QuizAPI.DTOs.Billing
{
    /// <summary>The limits a plan grants. Null means unlimited (or, for AI, no daily count).</summary>
    public class PlanLimitsDTO
    {
        public int? AiDailyGenerations { get; set; }
        public int? MaxOwnedQuizzes { get; set; }
        public int MaxLobbyPlayers { get; set; }
        public int? MaxClasses { get; set; }
    }

    /// <summary>One plan as the pricing page shows it. Prices are display prices in EUR.</summary>
    public class PlanDTO
    {
        /// <summary>"Free", "Plus" or "Teacher".</summary>
        public string Tier { get; set; } = "Free";
        public string Name { get; set; } = string.Empty;
        public decimal MonthlyEur { get; set; }
        public decimal YearlyEur { get; set; }
        public PlanLimitsDTO Limits { get; set; } = new();
    }

    public class PlanCatalogDTO
    {
        public List<PlanDTO> Plans { get; set; } = new();
        /// <summary>
        /// Whether a plan can be bought right now. False until a payment provider is configured;
        /// the pricing page then says "coming soon" instead of offering a checkout.
        /// </summary>
        public bool CheckoutAvailable { get; set; }
    }

    /// <summary>The caller's effective plan and its limits — what <c>GET /api/plans/me</c> answers.</summary>
    public class MyPlanDTO
    {
        public string Plan { get; set; } = "Free";
        public bool IsStaff { get; set; }
        public PlanLimitsDTO Limits { get; set; } = new();
        /// <summary>Renewal date, or the last day of a canceled plan. Null on Free and open-ended grants.</summary>
        public DateTime? PlanEndsAt { get; set; }
        public bool CancelAtPeriodEnd { get; set; }
    }

    /// <summary>An admin's view of one user's plan: the effective plan plus the manual grant, if any.</summary>
    public class UserPlanAdminDTO : MyPlanDTO
    {
        public Guid UserId { get; set; }
        /// <summary>The manual grant's plan while it counts, else null.</summary>
        public string? ManualPlan { get; set; }
        public DateTime? ManualEndsAt { get; set; }
        public string? ManualNote { get; set; }
    }

    /// <summary>Grant, change or revoke a manual plan. <see cref="Plan"/> null revokes.</summary>
    public class SetManualPlanDTO
    {
        /// <summary>"Plus", "Teacher", or null to revoke.</summary>
        public string? Plan { get; set; }
        /// <summary>When the grant stops. Null means until revoked.</summary>
        public DateTime? EndsAt { get; set; }
        public string? Note { get; set; }
    }
}
