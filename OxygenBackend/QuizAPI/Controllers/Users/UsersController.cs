using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Users.Services;
using QuizAPI.Controllers.Users.Services.UserStatsService;
using QuizAPI.DTOs.Quiz;
using QuizAPI.DTOs.User;
using QuizAPI.Filtering;
using QuizAPI.Services.AccountClosure;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Controllers.Users
{
    /// <summary>Controller for managing user operations.</summary>
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : BaseApiController
    {
        private readonly IUserService _userService;
        private readonly IAvatarService _avatarService;
        private readonly ICurrentUserService _currentUser;
        private readonly IUserStatsService _userStatsService;
        private readonly IAccountClosureService _accountClosure;

        public UsersController(
            IUserService userService,
            IAvatarService avatarService,
            ICurrentUserService currentUser,
            IUserStatsService userStatsService,
            IAccountClosureService accountClosure)
        {
            _userService = userService;
            _avatarService = avatarService;
            _currentUser = currentUser;
            _userStatsService = userStatsService;
            _accountClosure = accountClosure;
        }

        /// <summary>
        /// Upload or replace the signed-in user's avatar. Accepts JPG/PNG/WebP only (validated by
        /// real image content, not just the extension), ≤ 5 MB; replaces any previous avatar.
        /// </summary>
        [HttpPost("me/avatar")]
        [Authorize]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> UpdateMyAvatar([FromForm] IFormFile file, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId)
                return Unauthorized();

            var url = await _avatarService.UpdateAvatarAsync(userId, file, ct);
            return Ok(new { profileImageUrl = url });
        }

        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")] // Full user list is sensitive (matches /search).
        [ProducesResponseType(typeof(IEnumerable<UserDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsers(CancellationToken ct)
        {
            var users = await _userService.GetAllUsersAsync(ct);
            return Ok(users); // empty list => 200 + [], not 404
        }

        // Filtered + paginated users (shared filtering framework — see docs/quiz/filtering.md).
        // Admin-only: the user list is sensitive. Example:
        //   GET /api/users/search?search=alice&filter=isDeleted:eq:false&sort=dateRegistered:desc
        [HttpGet("search")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        [ProducesResponseType(typeof(PagedResponse<UserDTO>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SearchUsers([FromQuery] FilterQuery query, CancellationToken ct)
            => Ok(await _userService.SearchUsersAsync(query, ct));

        [HttpGet("{id:guid}")]
        [Authorize]
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

        /// <summary>
        /// Aggregate quiz-play statistics for the profile page (quizzes played, accuracy,
        /// average/best score, average answer time). Own stats only — admins may view anyone's —
        /// mirroring the visibility rule on <c>GET /api/QuizSessions/user/{userId}</c>.
        /// See docs/quiz/user-stats-history.md.
        /// </summary>
        [HttpGet("{id:guid}/quiz-stats")]
        [Authorize]
        [ProducesResponseType(typeof(UserQuizStatsDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetQuizStats(Guid id, CancellationToken ct)
        {
            if (_currentUser.UserId is null) return Unauthorized();
            if (id != _currentUser.UserId && !_currentUser.IsAdmin) return Forbid();

            var result = await _userStatsService.GetUserQuizStatsAsync(id, ct);
            return HandleResult(result);
        }

        [HttpGet("username/{username}")]
        [Authorize]
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
        [Authorize]
        [ProducesResponseType(typeof(IEnumerable<UserDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsersByIds(
            [FromBody] IEnumerable<Guid> userIds, CancellationToken ct)
        {
            var users = await _userService.GetUsersByIdsAsync(userIds, ct);
            return Ok(users);
        }

        // Admin-initiated user creation. Public self-signup goes through AuthenticationController.
        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        [ProducesResponseType(typeof(UserDTO), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<UserDTO>> CreateUser([FromBody] CreateUserDTO dto, CancellationToken ct)
        {
            var created = await _userService.CreateUserAsync(dto, ct);
            return CreatedAtAction(nameof(GetUser), new { id = created.Id }, created);
        }

        [HttpPut("{id:guid}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDTO dto, CancellationToken ct)
        {
            if (!CanActOnUser(id)) return Forbid();

            await _userService.UpdateUserAsync(id, dto, ct);
            return NoContent();
        }

        /// <summary>
        /// Replaces a user's role set. Admin/SuperAdmin only, and the SuperAdmin role specifically can
        /// only be granted or removed by a SuperAdmin (an Admin attempting it gets 403). A protected
        /// account's roles can't be changed at all. The body is the desired end-state list of role names.
        /// </summary>
        [HttpPut("{id:guid}/roles")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> SetUserRoles(
            Guid id, [FromBody] SetUserRolesDTO dto, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid callerId)
                return Unauthorized();

            // The service enforces the fine-grained rule; the controller just tells it whether the
            // caller is a SuperAdmin (from the validated JWT role claims).
            var callerIsSuperAdmin = User.IsInRole("SuperAdmin");

            await _userService.SetUserRolesAsync(id, dto, callerIsSuperAdmin, callerId, ct);
            return NoContent();
        }

        /// <summary>
        /// Administrative deletion (soft). Admin/SuperAdmin only — this used to be a bare
        /// [Authorize] + CanActOnUser, which resolves to "self OR Admin OR SuperAdmin" and let any
        /// Admin delete every SuperAdmin with no way back. The service owns the fine-grained rules
        /// (protected accounts, self-deletion, elevated targets); the controller only tells it
        /// whether the caller is a SuperAdmin, the same split SetUserRoles uses.
        /// See docs/adr/0011-system-accounts-are-protected-rows.md.
        /// </summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid callerId)
                return Unauthorized();

            await _userService.DeleteUserAsync(id, User.IsInRole("SuperAdmin"), callerId, ct);
            return NoContent();
        }

        /// <summary>
        /// Closes the caller's own account: schedules anonymisation and signs them out. Returns the
        /// date the scrub happens, so the client can say when recovery stops being possible.
        ///
        /// Separate from DELETE {id} on purpose — that is the administrative tool and refuses
        /// self-deletion. This one is how a person leaves, and unlike the admin action it is
        /// reversible for the whole grace period, by simply signing in again.
        /// See docs/adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md.
        /// </summary>
        [HttpPost("me/closure")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> CloseMyAccount(CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId)
                return Unauthorized();

            var anonymiseAt = await _accountClosure.RequestClosureAsync(userId, ct);
            return Ok(new { anonymiseAt });
        }

        /// <summary>
        /// Cancels a pending closure for the caller. Signing in does this automatically, so this
        /// exists for the case where the person is already signed in when they change their mind —
        /// and so that "undo" is an explicit action rather than a side effect you have to know about.
        /// </summary>
        [HttpDelete("me/closure")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CancelMyAccountClosure(CancellationToken ct)
        {
            if (_currentUser.UserId is not Guid userId)
                return Unauthorized();

            var cancelled = await _accountClosure.CancelClosureAsync(userId, ct);
            return cancelled ? NoContent() : NotFound("No pending account closure.");
        }

        /// <summary>
        /// True if the caller is acting on their own account, or is an Admin/SuperAdmin.
        /// Prevents one authenticated user from mutating another user's account (IDOR).
        ///
        /// This is a profile-edit guard and nothing more — only UpdateUser uses it. It is
        /// deliberately NOT enough for destructive actions: it says nothing about the target's own
        /// privileges, so on the delete endpoint it let an Admin remove a SuperAdmin. Deletion and
        /// role changes both pass the caller's SuperAdmin claim to the service and let it decide.
        /// </summary>
        private bool CanActOnUser(Guid targetUserId) =>
            _currentUser.UserId == targetUserId
            || User.IsInRole("Admin")
            || User.IsInRole("SuperAdmin");
    }
}