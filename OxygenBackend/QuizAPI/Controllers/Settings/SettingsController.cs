using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Settings;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.SettingsService;

namespace QuizAPI.Controllers.Settings
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ISettingsService _settingsService;
        private readonly ICurrentUserService _currentUser;

        public SettingsController(
            ISettingsService settingsService,
            ICurrentUserService currentUser)
        {
            _settingsService = settingsService;
            _currentUser = currentUser;
        }

        // GET /api/settings — current user's settings (created with defaults if missing).
        [HttpGet]
        public async Task<IActionResult> GetMySettings(CancellationToken ct)
        {
            var userId = _currentUser.UserId;
            if (userId == null) return Unauthorized();

            return Ok(await _settingsService.GetForUserAsync(userId.Value, ct));
        }

        // PUT /api/settings — update the current user's settings.
        [HttpPut]
        public async Task<IActionResult> UpdateMySettings(
            [FromBody] UpdateSettingsDTO dto,
            CancellationToken ct)
        {
            var userId = _currentUser.UserId;
            if (userId == null) return Unauthorized();

            return Ok(await _settingsService.UpdateForUserAsync(userId.Value, dto, ct));
        }
    }
}
