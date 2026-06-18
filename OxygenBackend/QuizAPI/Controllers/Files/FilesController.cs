using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Files.Services;
using QuizAPI.DTOs.Files;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace QuizAPI.Controllers.Files
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FilesController(IFileService fileService) : ControllerBase
    {
        private readonly IFileService _fileService = fileService;

        /// <summary>Upload a file and associate it with an owner entity (avatar, product photo, document, ...).</summary>
        [HttpPost]
        [RequestSizeLimit(100 * 1024 * 1024)] // 100 MB ceiling; per-kind limits enforced in FileService
        public async Task<IActionResult> Upload(
            [FromForm] IFormFile file,
            [FromForm] string entity,
            [FromForm] string entityId,
            CancellationToken ct)
        {
            var dto = await _fileService.UploadAsync(file, entity, entityId, GetCurrentUserId(), ct);
            return CreatedAtAction(nameof(GetByEntity), new { entity = dto.Entity, entityId = dto.EntityId }, dto);
        }

        /// <summary>List files for a given owner entity.</summary>
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<FileDTO>>> GetByEntity(
            [FromQuery] string entity,
            [FromQuery] string entityId,
            CancellationToken ct)
            => Ok(await _fileService.GetByEntityAsync(entity, entityId, ct));

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var deleted = await _fileService.DeleteAsync(id, ct);
            return deleted ? NoContent() : NotFound();
        }

        private Guid? GetCurrentUserId()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }
}
