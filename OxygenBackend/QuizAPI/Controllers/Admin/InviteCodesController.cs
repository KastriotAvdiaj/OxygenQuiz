using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Invitations;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Invitations;

namespace QuizAPI.Controllers.Admin
{
    /// <summary>
    /// Mints and manages single-use signup invite codes (see docs/auth/invite-code-system-plan.md).
    /// Admins only. Codes are stored hashed, so plaintext is returned exactly once — at generation.
    /// </summary>
    [ApiController]
    [Route("api/admin/invite-codes")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class InviteCodesController : ControllerBase
    {
        private readonly IInviteCodeRepository _repository;
        private readonly IInviteCodeGenerator _generator;
        private readonly IAuditService _auditService;
        private readonly ApplicationDbContext _context;

        public InviteCodesController(
            IInviteCodeRepository repository,
            IInviteCodeGenerator generator,
            IAuditService auditService,
            ApplicationDbContext context)
        {
            _repository = repository;
            _generator = generator;
            _auditService = auditService;
            _context = context;
        }

        // POST: api/admin/invite-codes
        /// <summary>
        /// Generates a batch of codes, stores their hashes, and returns the plaintext ONCE. Save
        /// them now — they can't be re-read later.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<GeneratedInviteCodesDTO>> Generate(
            [FromBody] GenerateInviteCodesDTO dto, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var plaintext = new List<string>(dto.Count);
            var entities = new List<InviteCode>(dto.Count);

            for (var i = 0; i < dto.Count; i++)
            {
                var code = _generator.Generate();
                plaintext.Add(code);
                entities.Add(new InviteCode
                {
                    CodeHash = _generator.Hash(code),
                    Label = dto.Label,
                    CreatedAt = now,
                    ExpiresAt = dto.ExpiresAt,
                });
            }

            await _repository.AddRangeAsync(entities, ct);
            await _repository.SaveChangesAsync(ct);

            await _auditService.LogAsync(
                AuditActions.InviteCodesGenerated, entity: "InviteCode",
                newValue: new { dto.Count, dto.Label, dto.ExpiresAt }, ct: ct);

            return Ok(new GeneratedInviteCodesDTO { Codes = plaintext });
        }

        // GET: api/admin/invite-codes
        /// <summary>Status of every code (newest first). Never returns plaintext.</summary>
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<InviteCodeStatusDTO>>> List(CancellationToken ct)
        {
            var codes = await _repository.ListAsync(ct);

            // Resolve usernames for consumed codes in one round-trip.
            var consumerIds = codes
                .Where(c => c.ConsumedByUserId != null)
                .Select(c => c.ConsumedByUserId!.Value)
                .Distinct()
                .ToList();

            var usernames = consumerIds.Count == 0
                ? new Dictionary<Guid, string>()
                : await _context.Users
                    .IgnoreQueryFilters() // show the consumer even if the account was later deleted
                    .Where(u => consumerIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.Username, ct);

            var result = codes.Select(c => new InviteCodeStatusDTO
            {
                Id = c.Id,
                Label = c.Label,
                CreatedAt = c.CreatedAt,
                ExpiresAt = c.ExpiresAt,
                ConsumedAt = c.ConsumedAt,
                ConsumedByUserId = c.ConsumedByUserId,
                ConsumedByUsername = c.ConsumedByUserId is { } id && usernames.TryGetValue(id, out var name)
                    ? name : null,
                RevokedAt = c.RevokedAt,
                IsRedeemable = c.IsRedeemable,
            }).ToList();

            return Ok(result);
        }

        // POST: api/admin/invite-codes/{id}/revoke
        /// <summary>Revokes an unused code so it can no longer be redeemed. Already-consumed codes
        /// can't be revoked (the account already exists).</summary>
        [HttpPost("{id:int}/revoke")]
        public async Task<IActionResult> Revoke(int id, CancellationToken ct)
        {
            var code = await _repository.GetByIdAsync(id, ct);
            if (code is null) return NotFound($"Invite code {id} not found.");

            if (code.ConsumedAt != null)
                return BadRequest("This code has already been redeemed and cannot be revoked.");

            if (code.RevokedAt != null)
                return NoContent(); // already revoked — idempotent

            code.RevokedAt = DateTime.UtcNow;
            await _repository.SaveChangesAsync(ct);

            await _auditService.LogAsync(
                AuditActions.InviteCodeRevoked, entity: "InviteCode", entityId: id.ToString(), ct: ct);

            return NoContent();
        }
    }
}
