using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Billing;
using QuizAPI.Models.Billing;
using QuizAPI.Services.Billing;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Billing
{
    /// <summary>
    /// Paid plans (docs/auth/paid-plans.md): the public catalogue the pricing page renders, the
    /// caller's own limits, and an admin's manual grants. Buying a plan is not here yet — that
    /// arrives with the payment provider, and <see cref="PlanCatalogDTO.CheckoutAvailable"/> says
    /// so in the meantime.
    /// </summary>
    [ApiController]
    [Route("api/plans")]
    public class PlansController : ControllerBase
    {
        private readonly IEntitlementService _entitlements;
        private readonly IManualPlanService _manual;
        private readonly ICurrentUserService _current;
        private readonly Microsoft.Extensions.Options.IOptions<QuizAPI.Services.Ai.AiOptions> _ai;

        public PlansController(
            IEntitlementService entitlements,
            IManualPlanService manual,
            ICurrentUserService current,
            Microsoft.Extensions.Options.IOptions<QuizAPI.Services.Ai.AiOptions> ai)
        {
            _entitlements = entitlements;
            _manual = manual;
            _current = current;
            _ai = ai;
        }

        /// <summary>Every plan with its limits and display prices. Anonymous — the pricing page is public.</summary>
        [HttpGet]
        [AllowAnonymous]
        public ActionResult<PlanCatalogDTO> Catalog()
        {
            var freeAi = _ai.Value.DefaultDailyQuota;
            var plans = new List<PlanDTO>
            {
                new()
                {
                    Tier = nameof(PlanTier.Free), Name = "Free",
                    Limits = PlanMapping.Limits(PlanCatalog.For(PlanTier.Free, freeAi)),
                },
            };
            plans.AddRange(PlanCatalog.PaidPlans.Select(p => new PlanDTO
            {
                Tier = p.Tier.ToString(),
                Name = p.Name,
                MonthlyEur = p.MonthlyEur,
                YearlyEur = p.YearlyEur,
                Limits = PlanMapping.Limits(PlanCatalog.For(p.Tier, freeAi)),
            }));

            return Ok(new PlanCatalogDTO { Plans = plans, CheckoutAvailable = false });
        }

        /// <summary>The caller's effective plan and limits. The client mirrors these to warn early; the API enforces them.</summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<MyPlanDTO>> Mine(CancellationToken ct)
        {
            if (_current.UserId is not Guid userId) return Unauthorized();
            return Ok(PlanMapping.Fill(new MyPlanDTO(), await _entitlements.GetAsync(userId, ct)));
        }

        /// <summary>One user's plan, for the admin Users table.</summary>
        [HttpGet("users/{id:guid}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<UserPlanAdminDTO>> GetUserPlan(Guid id, CancellationToken ct) =>
            Ok(await _manual.GetAsync(id, ct));

        /// <summary>Grant, change or revoke (<c>plan: null</c>) a user's manual plan. Granting Teacher also grants the Teacher role.</summary>
        [HttpPut("users/{id:guid}/manual")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<UserPlanAdminDTO>> SetManualPlan(Guid id, [FromBody] SetManualPlanDTO dto, CancellationToken ct)
        {
            if (_current.UserId is not Guid callerId) return Unauthorized();
            return Ok(await _manual.SetAsync(id, dto, callerId, User.IsInRole("SuperAdmin"), ct));
        }
    }
}
