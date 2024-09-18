using Microsoft.AspNetCore.Mvc;
using QuizAPI.Services;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using QuizAPI.Data;

namespace QuizAPI.Controllers
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
        public async Task<IActionResult> GetCurrentUser()
        {
           var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; 
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(Guid.Parse(userId));
            if (user == null)
            {
                return NotFound();
            }

            return Ok(user); 
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
                return Ok(new { Token = result.Token, User = result.User });
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
                return Ok(new { Token = result.Token, User = result.User });
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
