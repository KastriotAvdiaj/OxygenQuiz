using Microsoft.AspNetCore.Mvc;
using QuizAPI.Common;

namespace QuizAPI.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected IActionResult HandleResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return Ok(result.Data);
        }
        return HandleFailure(result);
    }

    protected IActionResult HandleResult(Result result)
    {
        if (result.IsSuccess)
        {
            return NoContent();
        }
        return HandleFailure(result);
    }

    // Using fully qualified name to avoid ambiguity with Microsoft.AspNetCore.Http.IResult
    private IActionResult HandleFailure(QuizAPI.Common.IResult result)
    {
        // If there are validation errors, it's a client-side mistake.
        // Return a 400 BadRequest with the list of errors.
        if (result.ValidationErrors.Any())
        {
            // Check for a "not found" scenario masquerading as a validation error.
            if (result.ValidationErrors.Count == 1 &&
                result.ValidationErrors.First().Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(new { Errors = result.ValidationErrors });
            }
            return BadRequest(new { Errors = result.ValidationErrors });
        }

        // If it's a generic failure, it could be something the client can't fix.
        // We check for common patterns to return more specific status codes.
        if (result.ErrorMessage?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true)
        {
            return NotFound(new { Error = result.ErrorMessage });
        }

        if (result.ErrorMessage?.Contains("already exists", StringComparison.OrdinalIgnoreCase) == true ||
            result.ErrorMessage?.Contains("already have an active session", StringComparison.OrdinalIgnoreCase) == true)
        {
            return Conflict(new { Error = result.ErrorMessage });
        }

        // For all other errors, we assume it's a server-side issue.
        // Return a 500 Internal Server Error.
        return StatusCode(StatusCodes.Status500InternalServerError, new { Error = result.ErrorMessage });
    }
}