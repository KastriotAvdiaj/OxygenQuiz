using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.User;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Controllers.Users
{
    /// <summary>Controller for managing user operations.</summary>
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : BaseApiController
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService) => _userService = userService;

        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<UserDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsers(CancellationToken ct)
        {
            var users = await _userService.GetAllUsersAsync(ct);
            return Ok(users); // empty list => 200 + [], not 404
        }

        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(UserDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserDTO>> GetUser(Guid id, CancellationToken ct)
        {
            var user = await _userService.GetUserByIdAsync(id, ct);
            return user is null ? NotFound($"User with ID {id} not found") : Ok(user);
        }

        /// <summary>
        /// Public, safe-to-expose profile for a user (no email/permissions/last login).
        /// NOT YET USED: scaffolded for the upcoming public profile page
        /// (/users/:userId on the frontend). No part of the UI links here yet.
        /// </summary>
        [HttpGet("{id:guid}/profile")]
        [ProducesResponseType(typeof(PublicUserProfileDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<PublicUserProfileDTO>> GetPublicProfile(Guid id, CancellationToken ct)
        {
            var user = await _userService.GetUserByIdAsync(id, ct);
            if (user is null) return NotFound($"User with ID {id} not found");

            return Ok(new PublicUserProfileDTO
            {
                Id = user.Id,
                Username = user.Username,
                ProfileImageUrl = user.ProfileImageUrl,
                DateRegistered = user.DateRegistered,
                Roles = user.Roles,
            });
        }

        [HttpGet("username/{username}")]
        [ProducesResponseType(typeof(UserDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserDTO>> GetUserByUsername(string username, CancellationToken ct)
        {
            var user = await _userService.GetUserByUsernameAsync(username, ct);
            return user is null ? NotFound($"User '{username}' not found") : Ok(user);
        }

        /// <summary>
        /// Live availability check for signup. Pass <c>username</c> and/or <c>email</c>;
        /// the response only includes the fields you asked about. Anonymous on purpose.
        /// </summary>
        [HttpGet("availability")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AvailabilityDTO), StatusCodes.Status200OK)]
        public async Task<ActionResult<AvailabilityDTO>> CheckAvailability(
            [FromQuery] string? username,
            [FromQuery] string? email,
            CancellationToken ct)
        {
            var result = new AvailabilityDTO();

            if (!string.IsNullOrWhiteSpace(username))
                result.UsernameAvailable = await _userService.IsUsernameAvailableAsync(username, ct);

            if (!string.IsNullOrWhiteSpace(email))
                result.EmailAvailable = await _userService.IsEmailAvailableAsync(email, ct);

            return Ok(result);
        }

        [HttpPost("batch")]
        [ProducesResponseType(typeof(IEnumerable<UserDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsersByIds(
            [FromBody] IEnumerable<Guid> userIds, CancellationToken ct)
        {
            var users = await _userService.GetUsersByIdsAsync(userIds, ct);
            return Ok(users);
        }

        [HttpPost]
        [ProducesResponseType(typeof(UserDTO), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<UserDTO>> CreateUser([FromBody] CreateUserDTO dto, CancellationToken ct)
        {
            var created = await _userService.CreateUserAsync(dto, ct);
            return CreatedAtAction(nameof(GetUser), new { id = created.Id }, created);
        }

        [HttpPut("{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDTO dto, CancellationToken ct)
        {
            await _userService.UpdateUserAsync(id, dto, ct);
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
        {
            await _userService.DeleteUserAsync(id, ct);
            return NoContent();
        }
    }
}