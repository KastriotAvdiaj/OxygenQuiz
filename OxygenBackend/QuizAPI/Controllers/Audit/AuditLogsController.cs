using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Audit;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Controllers.Audit
{
    /// <summary>Read-only access to the audit trail. Admins only — audit data is sensitive.</summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogRepository _repository;

        public AuditLogsController(IAuditLogRepository repository) => _repository = repository;

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] AuditLogQuery query, CancellationToken ct)
        {
            var (items, total) = await _repository.QueryAsync(query, ct);

            var dtos = items.Select(a => new AuditLogDTO
            {
                Id = a.Id,
                UserId = a.UserId,
                Action = a.Action,
                Entity = a.Entity,
                EntityId = a.EntityId,
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                IpAddress = a.IpAddress,
                CreatedAt = a.CreatedAt,
            });

            return Ok(new
            {
                items = dtos,
                total,
                page = query.Page < 1 ? 1 : query.Page,
                pageSize = query.PageSize,
            });
        }
    }
}
