using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Questions.TestQuestions.Services;
using QuizAPI.DTOs.Question;

namespace QuizAPI.Controllers.Questions.TestQuestions
{
    [ApiController]
    [Route("api/questions")]
    [Authorize] // Ensure users are authenticated
    public class TestQuestionController : ControllerBase
    {
        private readonly ITestQuestionService _testQuestionService;
        private readonly ILogger<TestQuestionController> _logger;

        public TestQuestionController(
            ITestQuestionService testQuestionService,
            ILogger<TestQuestionController> logger)
        {
            _testQuestionService = testQuestionService;
            _logger = logger;
        }

        /// <summary>
        /// Test a question without saving results to the database
        /// </summary>
        /// <param name="request">The test question request</param>
        /// <returns>Test results including correctness and score</returns>
        [HttpPost("test")]
        [ProducesResponseType(typeof(TestQuestionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<TestQuestionResponse>> TestQuestion([FromBody] TestQuestionRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _testQuestionService.TestQuestionAsync(request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Question not found for test");
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing question");
                return StatusCode(500, new { message = "An error occurred while testing the question" });
            }
        }
    }
}
