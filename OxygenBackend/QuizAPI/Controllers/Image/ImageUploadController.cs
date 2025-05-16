using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;

namespace QuizAPI.Controllers.Image
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<ImageUploadController> _logger;
        private readonly IImageService _imageService;
        private readonly long _fileSizeLimit = 5 * 1024 * 1024; // 5MB
        private readonly int _maxWidth = 2000;
        private readonly int _maxHeight = 2000;

        public ImageUploadController(
            IWebHostEnvironment env,
            ILogger<ImageUploadController> logger,
            IImageService imageService)
        {
            _env = env ?? throw new ArgumentNullException(nameof(env));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _imageService = imageService ?? throw new ArgumentNullException(nameof(imageService));
        }

        [HttpPost("question")]
        public async Task<IActionResult> UploadQuestionImage(IFormFile file)
        {
            try
            {
                // Check if file exists
                if (file == null || file.Length == 0)
                {
                    _logger.LogWarning("Upload attempt with no file");
                    return BadRequest("No file uploaded");
                }

                // Check file size
                if (file.Length > _fileSizeLimit)
                {
                    _logger.LogWarning($"Rejected file upload: size {file.Length} exceeds limit");
                    return BadRequest($"File size exceeds the limit of {_fileSizeLimit / (1024 * 1024)}MB");
                }

                // Read file to memory stream for validation
                await using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                // Validate image content
                try
                {
                    // This will validate the file is actually an image and can be processed
                    using var image = SixLabors.ImageSharp.Image.Load(memoryStream);
                    var format = image.Metadata.DecodedImageFormat;

                    // Check image dimensions
                    if (image.Width > _maxWidth || image.Height > _maxHeight)
                    {
                        _logger.LogWarning($"Rejected image: dimensions {image.Width}x{image.Height} exceed limits");
                        return BadRequest($"Image dimensions too large (max: {_maxWidth}x{_maxHeight})");
                    }

                    // Check if format is supported
                    if (!IsValidImageFormat(format))
                    {
                        _logger.LogWarning($"Rejected file: format {format.Name} not allowed");
                        return BadRequest("File type not supported. Allowed types: JPEG, PNG, GIF");
                    }

                    // Reset position to beginning of stream
                    memoryStream.Position = 0;

                    // Get file extension from actual format
                    var extension = format?.FileExtensions?.FirstOrDefault() ??
                        Path.GetExtension(file.FileName).TrimStart('.');

                    // Save using our service
                    var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";
                    var imageUrl = await _imageService.SaveImageAsync(memoryStream, file.FileName, extension);

                    // Add the base URL (should be refactored to be handled in the service)
                    if (!imageUrl.StartsWith("http"))
                    {
                        imageUrl = $"{baseUrl}{imageUrl}";
                    }

                    _logger.LogInformation($"Successfully uploaded image: {imageUrl}");
                    return Ok(new { url = imageUrl });
                }
                catch (UnknownImageFormatException)
                {
                    _logger.LogWarning("Rejected upload: unknown image format");
                    return BadRequest("The file is not a valid image");
                }
                catch (Exception ex) when (ex is InvalidImageContentException || ex is ImageFormatException)
                {
                    _logger.LogWarning($"Rejected corrupt image: {ex.Message}");
                    return BadRequest("Invalid or corrupted image file");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing image upload");
                return StatusCode(500, "An error occurred while processing the image");
            }
        }

        [HttpPost("associate")]
        public async Task<IActionResult> AssociateImage([FromBody] AssociateImageRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.ImageUrl) ||
                string.IsNullOrEmpty(request.EntityType) || request.EntityId <= 0)
            {
                return BadRequest("Invalid request parameters");
            }

            var success = await _imageService.AssociateImageWithEntityAsync(
                request.ImageUrl, request.EntityType, request.EntityId);

            if (!success)
            {
                return NotFound("Image not found");
            }

            return Ok(new { success = true });
        }

        private static bool IsValidImageFormat(IImageFormat format)
        {
            if (format == null)
            {
                return false; // If we can't determine the format, reject it
            }

            // Check by actual image format rather than just Content-Type
            var allowedFormats = new[] { "JPEG", "PNG", "GIF" };
            return allowedFormats.Contains(format.Name, StringComparer.OrdinalIgnoreCase);
        }
    }

    public class AssociateImageRequest
    {
        [Required]
        public string ImageUrl { get; set; }

        [Required]
        public string EntityType { get; set; }

        [Required]
        public int EntityId { get; set; }
    }
}