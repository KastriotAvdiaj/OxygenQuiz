using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Models;
using QuizAPI.Services;

namespace QuizAPI.Controllers.Totals
{
    // Aggregate dashboard counts — admin-only, matching the rest of the dashboard surface.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class TotalsController : ControllerBase
    {
        private readonly DashboardService _dashboardService;

        public TotalsController(DashboardService dashboardService)
        {
            _dashboardService = dashboardService;

        }

        [HttpGet("Users")]
        public ActionResult<int> GetTotalUsers()
        {
            var totalUsers = _dashboardService.GetTotalCount<User>();
            return Ok(totalUsers);
        }

        [HttpGet("Questions")]
        public ActionResult<int> GetTotalQuestions()
        {
            var totalQuestions = _dashboardService.GetTotalCount<QuestionBase>();
            return Ok(totalQuestions);
        }
    }
}
