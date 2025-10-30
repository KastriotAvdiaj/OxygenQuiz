using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Dashboard.Services;
using QuizAPI.DTOs.Shared;
using QuizAPI.Extensions;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Dashboard
{
    [ApiController]
    [Route("api/dashboard/quizzes")]
    [Authorize]
    public class DashboardQuizzesController : ControllerBase
    {
        private readonly IDashboardQuizService _quizService;

        public DashboardQuizzesController(IDashboardQuizService quizService)
        {
            _quizService = quizService;
        }

        [HttpGet]
        public async Task<IActionResult> GetQuizzes([FromQuery] QuizFilterParams filterParams)
        {
            var response = await _quizService.GetQuizzesAsync(User, filterParams);
            AppendPaginationHeader(response.Pagination);
            return Ok(response);
        }

        private void AppendPaginationHeader(PaginationMetadata pagination)
        {
            if (pagination == null)
            {
                return;
            }

            Response.AddPaginationHeader(
                pagination.CurrentPage,
                pagination.ItemsPerPage,
                pagination.TotalItems,
                pagination.TotalPages,
                pagination.HasNextPage,
                pagination.HasPreviousPage);
        }
    }
}
