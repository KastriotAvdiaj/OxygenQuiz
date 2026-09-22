using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using QuizAPI.Controllers.Authentication;
using QuizAPI.DTOs.Authentication;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.Interfaces;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// The session hint (docs/auth/session-hint.md, ADR 0016) is only safe while it travels with the
/// refresh cookie: set together, cleared together, same expiry. The frontend skips the network
/// entirely when the hint is absent, so a path that issued a refresh token WITHOUT the hint would
/// leave a signed-in user looking signed out, with nothing to correct it. These tests pin the
/// pairing at the HTTP boundary — the Set-Cookie headers the browser actually receives.
/// </summary>
public class SessionCookieTests
{
    private static readonly DateTime Expiry = new(2030, 1, 8, 12, 0, 0, DateTimeKind.Utc);

    private static AuthResult AuthResult() => new()
    {
        Response = new AuthResponseDTO { Token = "jwt" },
        RawRefreshToken = "raw-refresh",
        RefreshTokenExpiresAt = Expiry,
    };

    private static (AuthenticationController controller, Mock<IAuthenticationService> auth) Build(
        string? hintDomain = null, string? refreshCookie = null)
    {
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.LoginAsync(It.IsAny<LoginDTO>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AuthResult());
        auth.Setup(a => a.RefreshAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AuthResult());

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Auth:SessionHintCookieDomain"] = hintDomain,
            })
            .Build();

        var http = new DefaultHttpContext();
        if (refreshCookie is not null)
            http.Request.Headers.Cookie = $"refresh_token={refreshCookie}";

        var controller = new AuthenticationController(auth.Object, Mock.Of<IUserService>(), config)
        {
            ControllerContext = new ControllerContext { HttpContext = http },
        };
        return (controller, auth);
    }

    private static string[] SetCookies(ControllerBase c) =>
        c.Response.Headers.SetCookie.Select(v => v ?? "").ToArray();

    private static string CookieNamed(ControllerBase c, string name) =>
        Assert.Single(SetCookies(c), v => v.StartsWith(name + "="));

    [Fact]
    public async Task Login_sets_the_hint_beside_the_refresh_cookie_with_the_same_expiry()
    {
        var (controller, _) = Build();

        await controller.Login(new LoginDTO { Email = "a@b.c", Password = "pw" }, default);

        var refresh = CookieNamed(controller, "refresh_token");
        var hint = CookieNamed(controller, "has_session");

        Assert.Contains("httponly", refresh, StringComparison.OrdinalIgnoreCase);
        Assert.StartsWith("has_session=1", hint);
        // The whole point: JavaScript must be able to read it.
        Assert.DoesNotContain("httponly", hint, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/;", hint + ";", StringComparison.OrdinalIgnoreCase);

        var expires = Expiry.ToString("R");
        Assert.Contains(expires, refresh);
        Assert.Contains(expires, hint);
    }

    [Fact]
    public async Task Refresh_rotates_the_hint_along_with_the_refresh_cookie()
    {
        var (controller, _) = Build(refreshCookie: "old-refresh");

        await controller.Refresh(default);

        Assert.StartsWith("has_session=1", CookieNamed(controller, "has_session"));
    }

    [Fact]
    public async Task Hint_is_host_only_when_no_domain_is_configured()
    {
        var (controller, _) = Build(hintDomain: null);

        await controller.Login(new LoginDTO(), default);

        Assert.DoesNotContain("domain=", CookieNamed(controller, "has_session"), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Hint_is_widened_to_the_configured_domain()
    {
        var (controller, _) = Build(hintDomain: "oxygenquiz.com");

        await controller.Login(new LoginDTO(), default);

        Assert.Contains("domain=oxygenquiz.com", CookieNamed(controller, "has_session"), StringComparison.OrdinalIgnoreCase);
        // The refresh cookie stays on the API host — widening is for the hint alone.
        Assert.DoesNotContain("domain=", CookieNamed(controller, "refresh_token"), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Logout_clears_both_cookies_with_the_attributes_they_were_set_with()
    {
        var (controller, _) = Build(hintDomain: "oxygenquiz.com", refreshCookie: "raw");

        await controller.Logout(default);

        var refresh = CookieNamed(controller, "refresh_token");
        var hint = CookieNamed(controller, "has_session");

        Assert.StartsWith("refresh_token=;", refresh);
        Assert.StartsWith("has_session=;", hint);
        // A deletion only matches the original cookie if Domain and Path repeat exactly.
        Assert.Contains("domain=oxygenquiz.com", hint, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/;", hint + ";", StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Refresh_without_a_refresh_cookie_clears_a_stale_hint()
    {
        var (controller, auth) = Build();

        var result = await controller.Refresh(default);

        Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.StartsWith("has_session=;", CookieNamed(controller, "has_session"));
        // Nothing to clear on the credential side, and the service is never consulted.
        Assert.DoesNotContain(SetCookies(controller), v => v.StartsWith("refresh_token="));
        auth.Verify(a => a.RefreshAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
