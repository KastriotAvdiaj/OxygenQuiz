using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Exceptions;

namespace QuizAPI.Middleware
{
    public class GlobalExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<GlobalExceptionHandler> _logger;

        public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) => _logger = logger;

        public async ValueTask<bool> TryHandleAsync(
            HttpContext ctx, Exception ex, CancellationToken ct)
        {
            var (status, title) = ex switch
            {
                NotFoundException => (StatusCodes.Status404NotFound, ex.Message),
                AppValidationException => (StatusCodes.Status400BadRequest, ex.Message),
                ConflictException => (StatusCodes.Status409Conflict, ex.Message),
                ForbiddenException => (StatusCodes.Status403Forbidden, ex.Message),
                QuotaExceededException => (StatusCodes.Status429TooManyRequests, ex.Message),
                UnauthorizedException => (StatusCodes.Status401Unauthorized, ex.Message),
                ServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, ex.Message),
                _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
            };

            // Log the real exception; only leak generic text to the client on 500.
            if (status == StatusCodes.Status500InternalServerError)
                _logger.LogError(ex, "Unhandled exception");

            ctx.Response.StatusCode = status;
            var problem = new ProblemDetails { Status = status, Title = title };
            // A 503 from here is a sentence we wrote ("Wikimedia Commons is busy…"), not the server
            // falling over. The client hides every other 5xx behind a generic line, so this one says
            // it's meant to be read — the existing explicit override (docs/development/error-handling.md).
            if (ex is ServiceUnavailableException) problem.Extensions["isCustomMessage"] = true;
            await ctx.Response.WriteAsJsonAsync(problem, ct);

            return true; // handled
        }
    }
}