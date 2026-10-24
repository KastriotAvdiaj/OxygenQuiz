using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuizAPI.DTOs.Media;
using QuizAPI.Exceptions;
using QuizAPI.Middleware;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Media.Stock;

namespace QuizAPI.Controllers.Media
{
    /// <summary>
    /// Images from Pexels and Wikimedia Commons, searched through our API so the keys stay on the
    /// server, and imported into our own storage like an upload (docs/media/media-pipeline.md,
    /// "Outside sources").
    /// </summary>
    [ApiController]
    [Route("api/media/stock")]
    [Authorize]
    public sealed class StockImagesController(IStockImageService stock, ICurrentUserService current) : ControllerBase
    {
        /// <summary>Which sources this site offers (Pexels needs a key).</summary>
        [HttpGet("providers")]
        public ActionResult<IReadOnlyList<StockProviderDTO>> Providers() => Ok(stock.Providers());

        /// <summary>One page of results. Only reusable licences come back.</summary>
        [HttpGet("search")]
        [EnableRateLimiting(RateLimitingExtensions.MediaSearchPolicy)]
        public async Task<ActionResult<StockSearchResultDTO>> Search(
            [FromQuery] string provider, [FromQuery] string? q, [FromQuery] int page = 1, CancellationToken ct = default) =>
            Ok(await stock.SearchAsync(provider, q, page, ct));

        /// <summary>
        /// Store a chosen image as one of our assets, with its credit, and return it for the editor
        /// to attach on save. Takes a provider and an id only — the server finds the file and the
        /// credit itself. Counts as an upload for the hourly limit.
        /// </summary>
        [HttpPost("import")]
        [EnableRateLimiting(RateLimitingExtensions.MediaUploadPolicy)]
        [ProducesResponseType(typeof(MediaAssetDTO), StatusCodes.Status201Created)]
        public async Task<ActionResult<MediaAssetDTO>> Import([FromBody] StockImportCM cm, CancellationToken ct)
        {
            var userId = current.UserId ?? throw new UnauthorizedException("Sign in to add images.");
            var asset = await stock.ImportAsync(userId, cm, ct);
            return StatusCode(StatusCodes.Status201Created, asset);
        }

        /// <summary>
        /// The image for a search phrase an AI-written question came with (docs/media/media-pipeline.md,
        /// "AI-added images"): the code — not the model — searches, checks the licence and imports.
        /// 404 when nothing usable was found. Counts as an upload.
        /// </summary>
        [HttpPost("auto")]
        [EnableRateLimiting(RateLimitingExtensions.MediaUploadPolicy)]
        [ProducesResponseType(typeof(MediaAssetDTO), StatusCodes.Status201Created)]
        public async Task<ActionResult<MediaAssetDTO>> Auto([FromBody] StockAutoCM cm, CancellationToken ct)
        {
            var userId = current.UserId ?? throw new UnauthorizedException("Sign in to add images.");
            var asset = await stock.AutoImportAsync(userId, cm.Query, ct);
            return StatusCode(StatusCodes.Status201Created, asset);
        }
    }
}
