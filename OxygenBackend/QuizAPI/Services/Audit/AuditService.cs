using System.Text.Json;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Services.Audit
{
    public class AuditService : IAuditService
    {
        private readonly IAuditLogRepository _repository;
        private readonly ICurrentUserService _currentUser;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AuditService> _logger;

        public AuditService(
            IAuditLogRepository repository,
            ICurrentUserService currentUser,
            IHttpContextAccessor httpContextAccessor,
            ILogger<AuditService> logger)
        {
            _repository = repository;
            _currentUser = currentUser;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task LogAsync(
            string action,
            string? entity = null,
            string? entityId = null,
            object? oldValue = null,
            object? newValue = null,
            Guid? userId = null,
            CancellationToken ct = default)
        {
            try
            {
                var log = new AuditLog
                {
                    Id = Guid.NewGuid(),
                    // Explicit override wins (e.g. login, where the actor isn't yet
                    // authenticated in this request); otherwise use the request context.
                    UserId = userId ?? _currentUser.UserId,
                    Action = action,
                    Entity = entity,
                    EntityId = entityId,
                    OldValue = Serialize(oldValue),
                    NewValue = Serialize(newValue),
                    IpAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
                    CreatedAt = DateTime.UtcNow,
                };

                await _repository.AddAsync(log, ct);
                await _repository.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                // Auditing must never break the operation it records.
                _logger.LogError(ex, "Failed to write audit log for action {Action}", action);
            }
        }

        private static string? Serialize(object? value) =>
            value is null ? null
            : value as string  // already-serialized / plain strings pass through
              ?? JsonSerializer.Serialize(value);
    }
}
