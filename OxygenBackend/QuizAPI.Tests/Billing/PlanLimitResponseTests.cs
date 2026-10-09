using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Exceptions;
using QuizAPI.Middleware;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// Every endpoint that throws a <see cref="PlanLimitException"/> answers in one shape, which is
/// what lets the client show one upgrade prompt for all of them.
/// </summary>
public class PlanLimitResponseTests
{
    [Fact]
    public async Task A_plan_limit_is_a_403_carrying_the_limit_and_the_way_out()
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();

        await new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance).TryHandleAsync(
            ctx, new PlanLimitException("Your plan includes one class.", PlanLimits.Classes, 1, "Teacher"), default);

        Assert.Equal(StatusCodes.Status403Forbidden, ctx.Response.StatusCode);
        ctx.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(ctx.Response.Body);
        var root = body.RootElement;
        Assert.Equal("Your plan includes one class.", root.GetProperty("title").GetString());
        Assert.Equal("PlanLimitReached", root.GetProperty("code").GetString());
        Assert.Equal("classes", root.GetProperty("limit").GetString());
        Assert.Equal(1, root.GetProperty("max").GetInt32());
        Assert.Equal("Teacher", root.GetProperty("upgradeTo").GetString());
    }
}
