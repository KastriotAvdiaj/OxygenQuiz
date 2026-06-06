using System.IdentityModel.Tokens.Jwt;
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

        // Read the .NET-conventional id claim, but fall back to the raw JWT 'sub' so this
        // works whether or not inbound claim mapping is enabled.
        public Guid? UserId
        {
            get
            {
                var user = _httpContextAccessor.HttpContext?.User;
                var raw = user?.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? user?.FindFirstValue(JwtRegisteredClaimNames.Sub);
                return Guid.TryParse(raw, out var id) ? id : null;
            }
        }

        public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

        public bool IsAdmin => _httpContextAccessor.HttpContext?.User?.IsInRole("Admin") == true
                            || _httpContextAccessor.HttpContext?.User?.IsInRole("SuperAdmin") == true;
    }
}
