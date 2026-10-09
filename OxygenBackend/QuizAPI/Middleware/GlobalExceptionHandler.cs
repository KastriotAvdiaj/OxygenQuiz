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
                PlanLimitException => (StatusCodes.Status403Forbidden, ex.Message),
                UnauthorizedException => (StatusCodes.Status401Unauthorized, ex.Message),
                _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
            };

            // Log the real exception; only leak generic text to the client on 500.
            if (status == StatusCodes.Status500InternalServerError)
                _logger.LogError(ex, "Unhandled exception");

            var problem = new ProblemDetails { Status = status, Title = title };

            // A plan limit carries what the client needs to offer the upgrade, so the prompt is one
            // component reading this shape rather than a string match on the title per endpoint.
            if (ex is PlanLimitException limit)
            {
                problem.Extensions["code"] = "PlanLimitReached";
                problem.Extensions["limit"] = limit.Limit;
                problem.Extensions["max"] = limit.Max;
                problem.Extensions["upgradeTo"] = limit.UpgradeTo;
            }

            ctx.Response.StatusCode = status;
            await ctx.Response.WriteAsJsonAsync(problem, ct);

            return true; // handled
        }
    }
}