using Microsoft.AspNetCore.Mvc;
using QuizAPI.Services;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using QuizAPI.Data;
using QuizAPI.DTOs;
using QuizAPI.DTOs.User;
using Microsoft.AspNetCore.Authorization;

namespace QuizAPI.Controllers.Authentication
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthenticationController : ControllerBase
    {
        private readonly IAuthenticationService _authService;
        private readonly ApplicationDbContext _context;
        public AuthenticationController(IAuthenticationService authService, ApplicationDbContext context)
        {
            _authService = authService;
            _context = context;
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return Unauthorized("Invalid token.");
            }

            var user = await _context.Users.FindAsync(userGuid);
            if (user == null || user.IsDeleted)
            {
                return Unauthorized("User not found.");
            }

            return Ok(new UserDTO
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                Role = (await _context.Roles.FindAsync(user.RoleId))?.Name
            });
}

        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] SignupModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.SignupAsync(model.Email, model.Username, model.Password);
            if (result.Success)
            {
                return Ok(new { result.Token, result.User });
            }

            return BadRequest(result.Message);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.LoginAsync(model.Email, model.Password);
            if (result.Success)
            {
                return Ok(new { result.Token, result.User });
            }

            return Unauthorized(result.Message);
        }
    }

    public class SignupModel
    {
        [Required]
        public string Email { get; set; }

        [Required]
        public string Username { get; set; }

        [Required]
        public string Password { get; set; }
    }

    public class LoginModel
    {
        [Required]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }
}
