using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Invitations;
using QuizAPI.Services.Invitations;

namespace QuizAPI.Controllers.Admin
{
    /// <summary>
    /// Mints and manages single-use signup invite codes (see docs/auth/invite-code-system.md).
    /// Admins only. Codes are stored hashed, so plaintext is returned exactly once — at generation.
    ///
    /// The rules live in <see cref="IInviteCodeService"/>; this controller only reads the caller's
    /// SuperAdmin claim off the validated JWT and hands it down, the same split used for changing a
    /// user's roles.
    /// </summary>
    [ApiController]
    [Route("api/admin/invite-codes")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class InviteCodesController : ControllerBase
    {
        private readonly IInviteCodeService _service;

        public InviteCodesController(IInviteCodeService service) => _service = service;

        // POST: api/admin/invite-codes
        /// <summary>
        /// Generates a batch of codes, stores their hashes, and returns the plaintext ONCE. Save
        /// them now — they can't be re-read later. A code may grant a role on redemption; only a
        /// SuperAdmin may mint one granting SuperAdmin.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<GeneratedInviteCodesDTO>> Generate(
            [FromBody] GenerateInviteCodesDTO dto, CancellationToken ct) =>
            Ok(await _service.GenerateAsync(dto, User.IsInRole("SuperAdmin"), ct));

        // GET: api/admin/invite-codes
        /// <summary>Status of every code (newest first). Never returns plaintext.</summary>
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<InviteCodeStatusDTO>>> List(CancellationToken ct) =>
            Ok(await _service.ListAsync(ct));

        // POST: api/admin/invite-codes/{id}/revoke
        /// <summary>Revokes an unused code so it can no longer be redeemed. Already-consumed codes
        /// can't be revoked (the account already exists).</summary>
        [HttpPost("{id:int}/revoke")]
        public async Task<IActionResult> Revoke(int id, CancellationToken ct)
        {
            await _service.RevokeAsync(id, ct);
            return NoContent();
        }
    }
}
