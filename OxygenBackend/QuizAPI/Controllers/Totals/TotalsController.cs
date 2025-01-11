using Microsoft.AspNetCore.Mvc;
using QuizAPI.Models;
using QuizAPI.Models;
using QuizAPI.Services;

namespace QuizAPI.Controllers.Totals
{
    [ApiController]
    [Route("api/[controller]")]
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
            var totalQuestions = _dashboardService.GetTotalCount<Question>();
            return Ok(totalQuestions);
        }
    }
}
