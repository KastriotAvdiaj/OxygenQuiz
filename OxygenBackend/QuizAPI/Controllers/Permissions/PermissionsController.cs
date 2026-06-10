using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Permission;
using QuizAPI.ManyToManyTables;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Permissions;

namespace QuizAPI.Controllers.Permissions
{
    /// <summary>
    /// Manages role ↔ permission assignments (the matrix behind the admin Permissions page).
    /// SuperAdmin only: granting permissions is the most privileged action in the app.
    ///
    /// The SuperAdmin role is treated as a locked "system" role — it implicitly holds every
    /// permission (the app bypasses checks for it), so its grants are not editable here. This
    /// also removes any way to accidentally lock everyone out of permission management.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin")]
    public class PermissionsController : ControllerBase
    {
        private const string SuperAdminRole = "SuperAdmin";

        private readonly ApplicationDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IPermissionService _permissionService;

        public PermissionsController(
            ApplicationDbContext context,
            IAuditService auditService,
            IPermissionService permissionService)
        {
            _context = context;
            _auditService = auditService;
            _permissionService = permissionService;
        }

        // GET: api/permissions/matrix
        /// <summary>The whole matrix in one call: every permission plus every role with the
        /// ids of the permissions it currently holds.</summary>
        [HttpGet("matrix")]
        public async Task<ActionResult<PermissionMatrixDTO>> GetMatrix(CancellationToken ct)
        {
            // Materialise first, then derive Resource in memory — ResourceOf is a C#
            // helper EF can't translate to SQL.
            var permissionRows = await _context.Permissions
                .OrderBy(p => p.Id)
                .Select(p => new { p.Id, p.Name, p.Description, p.isActive })
                .ToListAsync(ct);

            var permissions = permissionRows
                .Select(p => new PermissionDTO
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Resource = ResourceOf(p.Name),
                    IsActive = p.isActive,
                })
                .ToList();

            var roles = await _context.Roles
                .OrderBy(r => r.Id)
                .Select(r => new RolePermissionsDTO
                {
                    Id = r.Id,
                    Name = r.Name,
                    Description = r.Description,
                    IsActive = r.isActive,
                    IsSystem = r.Name == SuperAdminRole,
                    PermissionIds = r.RolePermissions.Select(rp => rp.PermissionId).ToList(),
                })
                .ToListAsync(ct);

            // SuperAdmin implicitly holds everything; reflect that in the matrix so the UI
            // can render it fully-granted (and locked) without special-casing.
            var allPermissionIds = permissions.Select(p => p.Id).ToList();
            foreach (var role in roles.Where(r => r.IsSystem))
                role.PermissionIds = allPermissionIds;

            return Ok(new PermissionMatrixDTO { Permissions = permissions, Roles = roles });
        }

        // POST: api/permissions/roles/5/permissions/2
        /// <summary>Grant a permission to a role. Idempotent: granting an existing assignment
        /// is a no-op success.</summary>
        [HttpPost("roles/{roleId:int}/permissions/{permissionId:int}")]
        public Task<IActionResult> Grant(int roleId, int permissionId, CancellationToken ct) =>
            SetAssignment(roleId, permissionId, grant: true, ct);

        // DELETE: api/permissions/roles/5/permissions/2
        /// <summary>Revoke a permission from a role. Idempotent: revoking a missing assignment
        /// is a no-op success.</summary>
        [HttpDelete("roles/{roleId:int}/permissions/{permissionId:int}")]
        public Task<IActionResult> Revoke(int roleId, int permissionId, CancellationToken ct) =>
            SetAssignment(roleId, permissionId, grant: false, ct);

        // Single code path for grant/revoke: validate, apply if needed, audit, bust cache.
        private async Task<IActionResult> SetAssignment(
            int roleId, int permissionId, bool grant, CancellationToken ct)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == roleId, ct);
            if (role == null) return NotFound($"Role {roleId} not found.");

            if (role.Name == SuperAdminRole)
                return BadRequest("The SuperAdmin role holds every permission and cannot be edited.");

            var permission = await _context.Permissions
                .FirstOrDefaultAsync(p => p.Id == permissionId, ct);
            if (permission == null) return NotFound($"Permission {permissionId} not found.");

            var existing = await _context.RolePermissions
                .FirstOrDefaultAsync(rp => rp.RoleId == roleId && rp.PermissionId == permissionId, ct);

            // Already in the desired state — nothing to do, report success.
            if (grant == (existing != null)) return NoContent();

            if (grant)
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = roleId,
                    PermissionId = permissionId,
                });
            else
                _context.RolePermissions.Remove(existing!);

            await _context.SaveChangesAsync(ct);

            await _auditService.LogAsync(
                grant ? AuditActions.RolePermissionGranted : AuditActions.RolePermissionRevoked,
                entity: "Role",
                entityId: roleId.ToString(),
                newValue: new { role.Name, Permission = permission.Name });

            // Permissions are cached per-user for 10 min; evict everyone with this role.
            await _permissionService.InvalidateRoleAsync(roleId);

            return NoContent();
        }

        // "question:update:any" -> "question"
        private static string ResourceOf(string permissionName)
        {
            var i = permissionName.IndexOf(':');
            return i < 0 ? permissionName : permissionName[..i];
        }
    }
}
