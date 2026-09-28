using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuizAPI.DTOs.Authentication;
using QuizAPI.Middleware;                    // RateLimitingExtensions policy names
using QuizAPI.Services.Interfaces;          // IUserService
using System.IdentityModel.Tokens.Jwt;      // JwtRegisteredClaimNames
using System.Security.Claims;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.AccountIdentity;
using QuizAPI.DTOs.User;

namespace QuizAPI.Controllers.Authentication;

[ApiController]
[Route("api/[controller]")]
public class AuthenticationController(
    IAuthenticationService authService,
    IUserService userService,
    IAccountIdentityService accountIdentity,
    IConfiguration configuration) : ControllerBase
{
    private const string RefreshCookieName = "refresh_token";
    // Scope the cookie to the auth endpoints so it isn't attached to every API call.
    private const string RefreshCookiePath = "/api/Authentication";

    // The session hint: a non-secret, JavaScript-readable "1" that rides alongside the refresh
    // cookie and lives exactly as long. It answers one question for the frontend at boot — "is
    // there any point asking the server who I am?" — without a network round trip. It proves
    // nothing and grants nothing; the refresh cookie is still the only credential. The name is
    // mirrored in src/lib/session-hint.ts. See docs/auth/session-hint.md and ADR 0016.
    private const string SessionHintCookieName = "has_session";

    private readonly IAuthenticationService _authService = authService;
    private readonly IUserService _userService = userService;
    private readonly IAccountIdentityService _accountIdentity = accountIdentity;
    private readonly IConfiguration _configuration = configuration;

    // GET: api/Authentication/signup-config
    /// <summary>
    /// Public signup configuration so the frontend can render the right form (e.g. show/require the
    /// invite-code field) without hard-coding the flag. Anonymous — it leaks nothing sensitive.
    /// </summary>
    [HttpGet("signup-config")]
    public IActionResult SignupConfig() =>
        Ok(new { requireInviteCode = _configuration.GetValue<bool>("Signup:RequireInviteCode") });

    // GET: api/Authentication/auth-config
    /// <summary>
    /// Public auth configuration: the invite flag plus which external providers are enabled and
    /// their client ids. Client ids are public by design (they ship in the provider JS anyway);
    /// ids of disabled providers are withheld so the frontend can't accidentally render a
    /// half-configured button. Supersedes signup-config, which is kept for compatibility.
    /// </summary>
    [HttpGet("auth-config")]
    public IActionResult AuthConfig()
    {
        object Provider(string name) =>
            _configuration.GetValue<bool>($"Authentication:{name}:Enabled")
                ? new { enabled = true, clientId = _configuration[$"Authentication:{name}:ClientId"] }
                : new { enabled = false, clientId = (string?)null };

        return Ok(new
        {
            requireInviteCode = _configuration.GetValue<bool>("Signup:RequireInviteCode"),
            providers = new { google = Provider("Google"), microsoft = Provider("Microsoft") },
            // So the client's "at least N characters" hint cannot drift from what the server
            // actually enforces — it used to be a 12 hand-copied into three files.
            minPasswordLength = MinPasswordLengthAttribute.Resolve(_configuration),
        });
    }

    // POST: api/Authentication/external-login
    /// <summary>
    /// Sign in with a Google/Microsoft ID token. Three outcomes: an existing (or auto-linked)
    /// account → normal auth response + refresh cookie; no matching account → a signup-required
    /// payload with a short-lived ticket (no cookie, no session); a bad token → 401. Anonymous
    /// credential surface → same strict rate limit as login. See docs/auth/social-login-plan.md.
    /// </summary>
    [HttpPost("external-login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> ExternalLogin([FromBody] ExternalLoginDTO dto, CancellationToken ct)
    {
        var outcome = await _authService.ExternalLoginAsync(dto, ct);

        if (outcome.Auth is not null)
        {
            SetSessionCookies(outcome.Auth.RawRefreshToken, outcome.Auth.RefreshTokenExpiresAt);
            return Ok(outcome.Auth.Response);
        }

        return Ok(outcome.SignupRequired);
    }

    // POST: api/Authentication/external-signup
    /// <summary>
    /// Completes a first-time external signup: signup ticket + chosen username (+ invite code
    /// while the gate is on). On success the account is created, the provider identity linked,
    /// and the user logged in.
    /// </summary>
    [HttpPost("external-signup")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> ExternalSignup([FromBody] ExternalSignupDTO dto, CancellationToken ct)
    {
        var result = await _authService.ExternalSignupAsync(dto, ct);
        SetSessionCookies(result.RawRefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    // GET: api/Authentication/validate-invite-code?code=XXXX-XXXX-XX
    /// <summary>
    /// Advisory, non-consuming check that an invite code is currently redeemable, so the signup
    /// form can reject a bad code up front instead of at the end. Anonymous, but rate-limited on
    /// the same strict per-IP policy as the credential endpoints so it can't be used to enumerate
    /// valid codes. Returns only a boolean — it deliberately does NOT distinguish "unknown" from
    /// "already used" or "revoked". The authoritative validate-and-consume still happens at signup.
    /// </summary>
    [HttpGet("validate-invite-code")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ValidateInviteCode([FromQuery] string? code, CancellationToken ct)
    {
        var valid = await _authService.IsInviteCodeRedeemableAsync(code, ct);
        return Ok(new { valid });
    }

    [HttpPost("signup")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> Signup([FromBody] SignupDTO dto, CancellationToken ct)
    {
        var result = await _authService.SignupAsync(dto, ct);
        SetSessionCookies(result.RawRefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> Login([FromBody] LoginDTO dto, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(dto, ct);
        SetSessionCookies(result.RawRefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [HttpPost("refresh")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var raw = Request.Cookies[RefreshCookieName];

        // No cookie is the *normal* state for a signed-out visitor, not an error: the frontend
        // calls this on load to see whether a session can be resumed. Answer 401 directly rather
        // than letting the service throw — an exception here still ends as a 401, but only after
        // ExceptionHandlerMiddleware logs a full stack trace, so routine anonymous traffic used to
        // bury real failures in the container logs. A *present but invalid* token still throws:
        // that one is worth seeing.
        //
        // It is also the one place a stale session hint is corrected: a browser that sends the hint
        // but no refresh cookie has definitely got no session, so the hint goes too. The opposite
        // case — hint present, refresh cookie present but invalid — is deliberately NOT corrected
        // here; see "Why an invalid refresh token leaves the hint alone" in docs/auth/session-hint.md.
        if (string.IsNullOrWhiteSpace(raw))
        {
            ClearSessionHintCookie();
            return Unauthorized(new { message = "Missing refresh token." });
        }

        var result = await _authService.RefreshAsync(raw, ct);
        SetSessionCookies(result.RawRefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var raw = Request.Cookies[RefreshCookieName];
        await _authService.LogoutAsync(raw, ct);
        ClearSessionCookies();
        return NoContent();
    }

    [HttpPost("verify-email")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)] // token guessing surface
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDTO dto, CancellationToken ct)
    {
        await _authService.VerifyEmailAsync(dto.Token, ct);
        return Ok();
    }

    [HttpPost("resend-verification")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)] // triggers emails — limit abuse
    public async Task<IActionResult> ResendVerification(CancellationToken ct)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var userGuid))
            return Unauthorized();

        // Always 200 — the service is a no-op if already confirmed, so we never leak state.
        await _authService.ResendVerificationAsync(userGuid, ct);
        return Ok();
    }

    /// <summary>
    /// Start a password reset. <b>Always 200</b>, whether or not the address belongs to an
    /// account — anything else (a 404, a different message, a measurably different response time)
    /// turns this into a way to ask "does this person have an account here".
    /// </summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)] // triggers emails — limit abuse
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDTO dto, CancellationToken ct)
    {
        await _authService.RequestPasswordResetAsync(dto.Email, ct);
        return Ok();
    }

    /// <summary>
    /// Redeem a reset link. Anonymous by necessity — the whole point is that the caller cannot
    /// log in. Rate limited because it is a token-guessing surface, like verify-email.
    /// </summary>
    [HttpPost("reset-password")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)] // token guessing surface
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDTO dto, CancellationToken ct)
    {
        await _authService.ResetPasswordAsync(dto.Token, dto.NewPassword, ct);
        return Ok();
    }

    /// <summary>
    /// Redeem an email-change link (sent to the NEW address by POST /Users/me/email-change).
    /// Anonymous, like confirm-email: the link may be opened on a device that isn't signed in.
    /// Rate limited as a token-guessing surface. See docs/auth/account-identity-changes.md.
    /// </summary>
    [HttpPost("confirm-email-change")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    public async Task<IActionResult> ConfirmEmailChange([FromBody] ConfirmEmailChangeDTO dto, CancellationToken ct)
    {
        await _accountIdentity.ConfirmEmailChangeAsync(dto.Token, ct);
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

    /// <summary>
    /// Starts (or rotates) a browser session: the HttpOnly refresh cookie, which is the credential,
    /// and the readable session hint beside it, which is not. Every path that issues a refresh
    /// token comes through here, so the two cannot be set apart — and they share one expiry, so
    /// they also lapse together.
    /// </summary>
    private void SetSessionCookies(string rawToken, DateTime expiresAt)
    {
        Response.Cookies.Append(RefreshCookieName, rawToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = RefreshCookiePath,
            Expires = expiresAt
        });

        Response.Cookies.Append(SessionHintCookieName, "1", SessionHintCookieOptions(expiresAt));
    }

    /// <summary>Ends the browser session: both cookies, always together.</summary>
    private void ClearSessionCookies()
    {
        Response.Cookies.Append(RefreshCookieName, string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = RefreshCookiePath,
            Expires = DateTime.UtcNow.AddDays(-1)
        });

        ClearSessionHintCookie();
    }

    private void ClearSessionHintCookie() =>
        Response.Cookies.Append(
            SessionHintCookieName, string.Empty, SessionHintCookieOptions(DateTime.UtcNow.AddDays(-1)));

    /// <summary>
    /// The hint's cookie attributes. Clearing must repeat the exact Domain and Path it was set
    /// with, or the browser treats the deletion as a different cookie — which is why both the set
    /// and the clear build their options here.
    /// </summary>
    /// <remarks>
    /// <para><b>Not HttpOnly</b> — being readable by <c>document.cookie</c> is its entire job.</para>
    /// <para><b>Domain</b> comes from <c>Auth:SessionHintCookieDomain</c>. In production the API
    /// (api.oxygenquiz.com) and the SPA (oxygenquiz.com) are different hosts, and a host-only
    /// cookie set by the API is invisible to the SPA's JavaScript; <c>oxygenquiz.com</c> widens it
    /// to the whole site. Left unset in development, where both run on <c>localhost</c> and a
    /// host-only cookie is already shared across ports.</para>
    /// <para><b>SameSite=Lax</b> — the server never reads it, so it has no reason to travel on
    /// cross-site requests.</para>
    /// </remarks>
    private CookieOptions SessionHintCookieOptions(DateTime expiresAt)
    {
        var domain = _configuration["Auth:SessionHintCookieDomain"];
        return new CookieOptions
        {
            HttpOnly = false,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Domain = string.IsNullOrWhiteSpace(domain) ? null : domain,
            Expires = expiresAt
        };
    }
}
