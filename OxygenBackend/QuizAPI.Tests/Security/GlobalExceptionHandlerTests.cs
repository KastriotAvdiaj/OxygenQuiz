using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Exceptions;
using QuizAPI.Middleware;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// What the client is allowed to show. It hides every 5xx behind a generic line unless the body
/// says <c>isCustomMessage</c> (docs/development/error-handling.md); a 503 we raise on purpose is a
/// sentence for the user and must say so, while a crash must not.
/// </summary>
public class GlobalExceptionHandlerTests
{
    private static async Task<(int Status, JsonElement Body)> Handle(Exception ex)
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();
        await new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance).TryHandleAsync(ctx, ex, default);
        ctx.Response.Body.Position = 0;
        return (ctx.Response.StatusCode, JsonDocument.Parse(ctx.Response.Body).RootElement.Clone());
    }

    [Fact]
    public async Task An_outside_service_being_unavailable_is_a_503_the_user_is_shown()
    {
        var (status, body) = await Handle(new ServiceUnavailableException("Wikimedia Commons is busy right now."));

        Assert.Equal(503, status);
        Assert.Equal("Wikimedia Commons is busy right now.", body.GetProperty("title").GetString());
        Assert.True(body.GetProperty("isCustomMessage").GetBoolean());
    }

    [Fact]
    public async Task A_crash_is_a_generic_500_with_nothing_to_show()
    {
        var (status, body) = await Handle(new InvalidOperationException("Npgsql: relation \"x\" does not exist"));

        Assert.Equal(500, status);
        Assert.Equal("An unexpected error occurred.", body.GetProperty("title").GetString());
        Assert.False(body.TryGetProperty("isCustomMessage", out _));
    }
}
