using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuizAPI.DTOs.Media;
using QuizAPI.Exceptions;
using QuizAPI.Middleware;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Media;

namespace QuizAPI.Controllers.Media
{
    /// <summary>
    /// Uploads for question and quiz media (docs/media/media-pipeline.md). An upload only stores the
    /// file; a question or quiz save attaches it by id. There is no list, read or delete endpoint:
    /// an asset isn't owned by its uploader, and unused ones are swept.
    /// </summary>
    [ApiController]
    [Route("api/media")]
    [Authorize]
    public sealed class MediaController(IMediaService media, ICurrentUserService current) : ControllerBase
    {
        /// <summary>One request's ceiling: the largest accepted file (10 MB) plus multipart overhead.
        /// Kestrel's own default (30 MB) would otherwise let a 30 MB body be read before we refuse it.</summary>
        public const long MaxRequestBytes = 15L * 1024 * 1024;

        /// <summary>Upload an image (JPEG/PNG/WebP, stored as WebP ≤1600px) or an audio clip
        /// (MP3/M4A/OGG, ≤60 s). 30 per hour per account.</summary>
        [HttpPost]
        [EnableRateLimiting(RateLimitingExtensions.MediaUploadPolicy)]
        [RequestSizeLimit(MaxRequestBytes)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
        [ProducesResponseType(typeof(MediaAssetDTO), StatusCodes.Status201Created)]
        public async Task<ActionResult<MediaAssetDTO>> Upload(IFormFile? file, CancellationToken ct)
        {
            var userId = current.UserId ?? throw new UnauthorizedException("Sign in to upload.");
            if (file is null || file.Length == 0) throw new AppValidationException("Choose a file to upload.");

            using var buffer = new MemoryStream((int)Math.Min(file.Length, MaxRequestBytes));
            await file.CopyToAsync(buffer, ct);

            var asset = await media.UploadAsync(buffer.ToArray(), userId, credit: null, ct);
            return StatusCode(StatusCodes.Status201Created, asset);
        }

        /// <summary>The caller's allowance: new media today and storage used, with their limits.</summary>
        [HttpGet("quota")]
        public async Task<ActionResult<MediaQuotaStatusDTO>> Quota(CancellationToken ct)
        {
            var userId = current.UserId ?? throw new UnauthorizedException("Sign in.");
            return Ok(await media.GetQuotaStatusAsync(userId, ct));
        }
    }
}
