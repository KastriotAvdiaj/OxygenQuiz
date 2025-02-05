﻿using Microsoft.AspNetCore.Mvc;
using QuizAPI.Services;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using QuizAPI.Data;
using QuizAPI.DTOs;
using QuizAPI.DTOs.User;

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
                return Ok();
                //Changed for a while because a deleted user was still logged in.
            }

            var role = await _context.Roles.FindAsync(user.RoleId);

            if (role == null)
            {
                return BadRequest();
            }

            var sentUser = new UserDTO
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                Role = role.Name,
            };

            return Ok(sentUser);
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
