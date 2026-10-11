using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using QuizAPI.Common;
using QuizAPI.Controllers;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.DTOs.Quiz;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// A guest's one free quiz is spent when it starts, and that one session can be carried on with.
/// Before this the cookie was only set once the results had been seen, so leaving before them —
/// on the last question, if you liked — left the browser free to start another, indefinitely.
/// See docs/auth/guest-play.md § "The free quiz is spent when it starts".
/// </summary>
public class GuestFreeQuizTests
{
    private const string Cookie = "guest_played";

    private readonly Mock<IQuizSessionService> _sessions = new();
    private readonly DefaultHttpContext _http = new();

    private GuestQuizSessionsController Controller() =>
        new(_sessions.Object) { ControllerContext = new ControllerContext { HttpContext = _http } };

    private void WithCookie(string value) => _http.Request.Headers.Cookie = $"{Cookie}={value}";

    private string SetCookieHeader => _http.Response.Headers.SetCookie.ToString();

    private static T Property<T>(IActionResult result, string name)
    {
        var value = Assert.IsType<OkObjectResult>(result).Value!;
        return (T)value.GetType().GetProperty(name)!.GetValue(value)!;
    }

    [Fact]
    public async Task StartingTheQuizSpendsIt_AndTheCookieNamesTheSession()
    {
        var sessionId = Guid.NewGuid();
        _sessions.Setup(s => s.CreateGuestSessionAsync(7))
            .ReturnsAsync(Result<QuizSessionDto>.Success(new QuizSessionDto { Id = sessionId }));

        var result = await Controller().CreateGuestSession(new GuestQuizSessionCM { QuizId = 7 });

        Assert.IsType<CreatedAtActionResult>(result);
        Assert.Contains($"{Cookie}={sessionId}", SetCookieHeader);
    }

    [Fact]
    public async Task ASecondQuizIsRefused_HoweverTheFirstOneEnded()
    {
        WithCookie(Guid.NewGuid().ToString());

        var result = await Controller().CreateGuestSession(new GuestQuizSessionCM { QuizId = 7 });

        Assert.IsType<ForbidResult>(result);
        _sessions.Verify(s => s.CreateGuestSessionAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task AQuizThatFailedToStartSpendsNothing()
    {
        _sessions.Setup(s => s.CreateGuestSessionAsync(7))
            .ReturnsAsync(Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available."));

        await Controller().CreateGuestSession(new GuestQuizSessionCM { QuizId = 7 });

        Assert.DoesNotContain(Cookie, SetCookieHeader);
    }

    [Fact]
    public async Task NoCookie_MayPlay()
    {
        var result = await Controller().CanPlay();

        Assert.True(Property<bool>(result, "canPlay"));
    }

    [Fact]
    public async Task AStartedSessionThatStillExists_CanBeCarriedOnWith_ButNotReplaced()
    {
        var sessionId = Guid.NewGuid();
        WithCookie(sessionId.ToString());
        _sessions.Setup(s => s.IsGuestSessionAsync(sessionId)).ReturnsAsync(true);

        var result = await Controller().CanPlay();

        Assert.False(Property<bool>(result, "canPlay"));
        Assert.Equal(sessionId, Property<Guid?>(result, "resumeSessionId"));
    }

    [Theory]
    [InlineData("1")] // results seen: /finish deleted the session
    [InlineData("11111111-1111-1111-1111-111111111111")] // left mid-quiz, the sweep deleted it
    public async Task ASpentQuiz_HasNothingToCarryOnWith(string cookie)
    {
        WithCookie(cookie);
        _sessions.Setup(s => s.IsGuestSessionAsync(It.IsAny<Guid>())).ReturnsAsync(false);

        var result = await Controller().CanPlay();

        var value = Assert.IsType<OkObjectResult>(result).Value!;
        Assert.False((bool)value.GetType().GetProperty("canPlay")!.GetValue(value)!);
        Assert.Null(value.GetType().GetProperty("resumeSessionId")!.GetValue(value));
    }

    [Fact]
    public async Task SeeingTheResults_LeavesNothingToComeBackTo()
    {
        var sessionId = Guid.NewGuid();
        WithCookie(sessionId.ToString());
        _sessions.Setup(s => s.IsGuestSessionAsync(sessionId)).ReturnsAsync(true);
        _sessions.Setup(s => s.DiscardGuestSessionAsync(sessionId)).ReturnsAsync(Result.Success());

        await Controller().Finish(sessionId);

        Assert.Contains($"{Cookie}=1", SetCookieHeader);
    }
}
