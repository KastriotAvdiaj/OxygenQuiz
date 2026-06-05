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
    private readonly IAuthenticationService _authService = authService;
    private readonly IUserService _userService = userService;

    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupDTO dto, CancellationToken ct)
    => Ok(await _authService.SignupAsync(dto, ct));

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDTO dto, CancellationToken ct)
        => Ok(await _authService.LoginAsync(dto, ct));

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
}