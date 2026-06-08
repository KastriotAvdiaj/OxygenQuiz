using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.DTOs.Notification;
using QuizAPI.Exceptions;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Notifications
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly ICurrentUserService _currentUser;

        public NotificationsController(INotificationService notificationService, ICurrentUserService currentUser)
        {
            _notificationService = notificationService;
            _currentUser = currentUser;
        }

        /// <summary>The current user's notifications (optionally only unread).</summary>
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<NotificationDTO>>> GetMine(
            [FromQuery] bool unreadOnly = false, CancellationToken ct = default)
        {
            var userId = RequireUserId();
            return Ok(await _notificationService.GetForUserAsync(userId, unreadOnly, ct));
        }

        [HttpGet("unread-count")]
        public async Task<ActionResult<object>> UnreadCount(CancellationToken ct)
        {
            var userId = RequireUserId();
            return Ok(new { count = await _notificationService.GetUnreadCountAsync(userId, ct) });
        }

        /// <summary>Create a notification for a user. Admin/system only.</summary>
        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<NotificationDTO>> Create([FromBody] CreateNotificationDTO dto, CancellationToken ct)
        {
            var created = await _notificationService.CreateAsync(dto.UserId, dto.Type, dto.Title, dto.Message, ct);
            return CreatedAtAction(nameof(GetMine), null, created);
        }

        [HttpPatch("{id:guid}/read")]
        public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
        {
            await _notificationService.MarkReadAsync(id, RequireUserId(), ct);
            return NoContent();
        }

        [HttpPatch("read-all")]
        public async Task<ActionResult<object>> MarkAllRead(CancellationToken ct)
        {
            var updated = await _notificationService.MarkAllReadAsync(RequireUserId(), ct);
            return Ok(new { updated });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            await _notificationService.DeleteAsync(id, RequireUserId(), ct);
            return NoContent();
        }

        private Guid RequireUserId() =>
            _currentUser.UserId ?? throw new UnauthorizedException("No authenticated user.");
    }
}
