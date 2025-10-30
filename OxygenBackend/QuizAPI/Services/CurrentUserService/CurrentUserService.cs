using System.Security.Claims;

namespace QuizAPI.Services.CurrentUserService
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        // This implementation now uses ClaimTypes.NameIdentifier to match your token setup.
        public Guid? UserId => Guid.TryParse(
            _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

        public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

        public bool IsAdmin => _httpContextAccessor.HttpContext?.User?.IsInRole("Admin") == true
                            || _httpContextAccessor.HttpContext?.User?.IsInRole("SuperAdmin") == true;
    }
}
