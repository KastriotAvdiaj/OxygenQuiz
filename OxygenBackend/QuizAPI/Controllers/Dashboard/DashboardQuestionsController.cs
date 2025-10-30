using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Dashboard.Services;
using QuizAPI.DTOs.Shared;
using QuizAPI.Extensions;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Dashboard
{
    [ApiController]
    [Route("api/dashboard/questions")]
    [Authorize]
    public class DashboardQuestionsController : ControllerBase
    {
        private readonly IDashboardQuestionsService _questionsService;

        public DashboardQuestionsController(IDashboardQuestionsService questionsService)
        {
            _questionsService = questionsService;
        }

        [HttpGet]
        public async Task<IActionResult> GetQuestions([FromQuery] QuestionFilterParams filterParams)
        {
            var response = await _questionsService.GetQuestionsAsync(User, filterParams);
            AppendPaginationHeader(response.Pagination);
            return Ok(response);
        }

        [HttpGet("multiple-choice")]
        public async Task<IActionResult> GetMultipleChoice([FromQuery] QuestionFilterParams filterParams)
        {
            var response = await _questionsService.GetMultipleChoiceQuestionsAsync(User, filterParams);
            AppendPaginationHeader(response.Pagination);
            return Ok(response);
        }

        [HttpGet("true-false")]
        public async Task<IActionResult> GetTrueFalse([FromQuery] QuestionFilterParams filterParams)
        {
            var response = await _questionsService.GetTrueFalseQuestionsAsync(User, filterParams);
            AppendPaginationHeader(response.Pagination);
            return Ok(response);
        }

        [HttpGet("type-the-answer")]
        public async Task<IActionResult> GetTypeTheAnswer([FromQuery] QuestionFilterParams filterParams)
        {
            var response = await _questionsService.GetTypeTheAnswerQuestionsAsync(User, filterParams);
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
