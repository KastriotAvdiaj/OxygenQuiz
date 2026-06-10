using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Audit;
using QuizAPI.Filtering;
using QuizAPI.Models;
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

        // Shared filtering framework (operators + search + sort + body-envelope pagination).
        // Example: GET /api/auditlogs/search?filter=action:in:QuizCreated,QuizDeleted&sort=createdAt:desc
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] FilterQuery query, CancellationToken ct)
        {
            var source = FilterEngine.Apply(_repository.Query(), query, AuditLogFilterFields.Fields);
            var result = await PagedResponse<AuditLogDTO>.CreateAsync(
                source, query.Page, query.PageSize,
                rows => rows.Select(ToDto).ToList(),
                ct);
            return Ok(result);
        }

        private static AuditLogDTO ToDto(AuditLog a) => new()
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
        };

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
