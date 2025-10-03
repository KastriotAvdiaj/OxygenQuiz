using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers;
using QuizAPI.DTOs.User;
using QuizAPI.Models;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Controllers.Users
{
    /// <summary>
    /// Controller for managing user operations
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : BaseApiController
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Gets all users with their details
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<FullUserDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userService.GetAllUsersAsync();

            if (users == null || !users.Any())
            {
                return NotFound("No users found");
            }

            return Ok(users);
        }

        /// <summary>
        /// Gets a specific user by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(User), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _userService.GetUserByIdAsync(id);

            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            return Ok(user);
        }

        /// <summary>
        /// Gets a user by username
        /// </summary>
        [HttpGet("username/{username}")]
        [ProducesResponseType(typeof(User), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetUserByUsername(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return BadRequest("Username cannot be empty");
            }

            var user = await _userService.GetUserByUsernameAsync(username);

            if (user == null)
            {
                return NotFound($"User with username '{username}' not found");
            }

            return Ok(user);
        }

        /// <summary>
        /// Gets multiple users by their IDs
        /// </summary>
        [HttpPost("batch")]
        [ProducesResponseType(typeof(IEnumerable<User>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetUsersByIds([FromBody] IEnumerable<Guid> userIds)
        {
            if (userIds == null || !userIds.Any())
            {
                return BadRequest("User IDs list cannot be empty");
            }

            var users = await _userService.GetUsersByIdsAsync(userIds);
            return Ok(users);
        }

        /// <summary>
        /// Updates a user's information
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] User user)
        {
            if (id != user.Id)
            {
                return BadRequest("User ID in URL does not match user ID in body");
            }

            var success = await _userService.UpdateUserAsync(id, user);

            if (!success)
            {
                return NotFound($"User with ID {id} not found");
            }

            return NoContent();
        }

        /// <summary>
        /// Creates a new user
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(User), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateUser([FromBody] TemporaryUserCR userCreateModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var newUser = await _userService.CreateUserAsync(userCreateModel);
                return CreatedAtAction(nameof(GetUser), new { id = newUser.Id }, newUser);
            }
            catch (Exception ex)
            {
                return BadRequest($"Failed to create user: {ex.Message}");
            }
        }

        /// <summary>
        /// Soft deletes a user (marks as deleted)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteUser(Guid id, [FromHeader] string authorization)
        {
            // Validate JWT token
            var tokenValidationResult = ValidateJwtToken(authorization);
            if (!tokenValidationResult.IsValid)
            {
                return Unauthorized(tokenValidationResult.ErrorMessage);
            }

            var success = await _userService.DeleteUserAsync(id);

            if (!success)
            {
                return NotFound($"User with ID {id} not found");
            }

            return NoContent();
        }

        private static (bool IsValid, string? ErrorMessage) ValidateJwtToken(string authorization)
        {
            if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            {
                return (false, "Invalid or missing token.");
            }

            try
            {
                var token = authorization.Substring("Bearer ".Length).Trim();
                var handler = new JwtSecurityTokenHandler();
                var jwtToken = handler.ReadJwtToken(token);

                if (jwtToken.ValidTo < DateTime.UtcNow)
                {
                    return (false, "Token has expired.");
                }

                return (true, null);
            }
            catch (Exception)
            {
                return (false, "Invalid token format.");
            }
        }
    }
}