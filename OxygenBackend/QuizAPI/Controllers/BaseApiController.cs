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

    // Helper method for controllers that don't use Result pattern yet
    protected IActionResult HandleCustomError(string message, bool isCustomMessage = true)
    {
        if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(new { message = message, isCustomMessage = isCustomMessage });
        }

        if (message.Contains("already exists", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("cannot be deleted", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("already have an active session", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = message, isCustomMessage = isCustomMessage });
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new { 
            message = message, 
            isCustomMessage = isCustomMessage 
        });
    }

    // Using fully qualified name to avoid ambiguity with Microsoft.AspNetCore.Http.IResult
    private IActionResult HandleFailure(QuizAPI.Common.IResult result)
    {
        // Define patterns for custom user-facing messages
        var customMessagePatterns = new[]
        {
            "not found or you're not authorized",
            "used in a quiz and cannot be deleted",
            "already exists",
            "cannot be deleted",
            "not authorized",
            "insufficient permissions",
            "already have an active session",
            "Quiz not found or not available",
            "Session not found",
            "This quiz session is already completed"
        };

        // If there are validation errors, it's a client-side mistake.
        if (result.ValidationErrors.Any())
        {
            var errorMessage = result.ValidationErrors.First();
            var isCustomMessage = customMessagePatterns.Any(pattern => 
                errorMessage.Contains(pattern, StringComparison.OrdinalIgnoreCase));

            // Check for a "not found" scenario masquerading as a validation error.
            if (errorMessage.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(new { 
                    message = errorMessage,
                    isCustomMessage = isCustomMessage,
                    errors = result.ValidationErrors 
                });
            }
            
            return BadRequest(new { 
                message = errorMessage,
                isCustomMessage = isCustomMessage,
                errors = result.ValidationErrors 
            });
        }

        // Handle single error messages
        var message = result.ErrorMessage ?? "An error occurred";
        var isCustom = customMessagePatterns.Any(pattern => 
            message.Contains(pattern, StringComparison.OrdinalIgnoreCase));

        // Check for common patterns to return more specific status codes.
        if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(new { 
                message = message,
                isCustomMessage = isCustom 
            });
        }

        if (message.Contains("already exists", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("already have an active session", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { 
                message = message,
                isCustomMessage = isCustom 
            });
        }

        // For all other errors, we assume it's a server-side issue.
        return StatusCode(StatusCodes.Status500InternalServerError, new { 
            message = message,
            isCustomMessage = isCustom 
        });
    }
}