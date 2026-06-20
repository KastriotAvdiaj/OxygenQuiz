using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Authentication;
using QuizAPI.Services.Interfaces;          // IUserService
using System.IdentityModel.Tokens.Jwt;      // JwtRegisteredClaimNames
using System.Security.Claims;
using QuizAPI.Services.AuthenticationService;

namespace QuizAPI.Controllers.Authentication;

[ApiController]
[Route("api/[controller]")]
public class AuthenticationController(
    IAuthenticationService authService,
    IUserService userService) : ControllerBase
{
    private const string RefreshCookieName = "refresh_token";
    // Scope the cookie to the auth endpoints so it isn't attached to every API call.
    private const string RefreshCookiePath = "/api/Authentication";

    private readonly IAuthenticationService _authService = authService;
    private readonly IUserService _userService = userService;

    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupDTO dto, CancellationToken ct)
    {
        var result = await _authService.SignupAsync(dto, ct);
        SetRefreshCookie(result.RawRefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDTO dto, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(dto, ct);
        SetRefreshCookie(result.RawRefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var raw = Request.Cookies[RefreshCookieName];
        var result = await _authService.RefreshAsync(raw ?? string.Empty, ct);
        SetRefreshCookie(result.RawRefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var raw = Request.Cookies[RefreshCookieName];
        await _authService.LogoutAsync(raw, ct);
        ClearRefreshCookie();
        return NoContent();
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDTO dto, CancellationToken ct)
    {
        await _authService.VerifyEmailAsync(dto.Token, ct);
        return Ok();
    }

    [HttpPost("resend-verification")]
    [Authorize]
    public async Task<IActionResult> ResendVerification(CancellationToken ct)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var userGuid))
            return Unauthorized();

        // Always 200 — the service is a no-op if already confirmed, so we never leak state.
        await _authService.ResendVerificationAsync(userGuid, ct);
        return Ok();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser(CancellationToken ct)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var userGuid))
            return Unauthorized();

        var user = await _userService.GetUserByIdAsync(userGuid, ct);  // if IUserService takes ct
        return Ok(user);
    }

    private void SetRefreshCookie(string rawToken, DateTime expiresAt) =>
        Response.Cookies.Append(RefreshCookieName, rawToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = RefreshCookiePath,
            Expires = expiresAt
        });

    private void ClearRefreshCookie() =>
        Response.Cookies.Append(RefreshCookieName, string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = RefreshCookiePath,
            Expires = DateTime.UtcNow.AddDays(-1)
        });
}
