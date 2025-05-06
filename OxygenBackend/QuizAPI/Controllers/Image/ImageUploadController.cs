using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Processing;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace QuizAPI.Controllers.Image
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<ImageUploadController> _logger;
        private readonly long _fileSizeLimit = 5 * 1024 * 1024; // 5MB
        private readonly int _maxWidth = 2000;
        private readonly int _maxHeight = 2000;

        public ImageUploadController(IWebHostEnvironment env, ILogger<ImageUploadController> logger)
        {
            _env = env ?? throw new ArgumentNullException(nameof(env));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
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

                // Prepare upload directory
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
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

                    // Generate unique filename with proper extension based on actual format
                    var extension = format?.FileExtensions?.FirstOrDefault() ?? Path.GetExtension(file.FileName).TrimStart('.');
                    var fileName = $"{Guid.NewGuid()}.{extension}";
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    // Save the file
                    await using (var fileStream = new FileStream(filePath, FileMode.Create))
                    {
                        await memoryStream.CopyToAsync(fileStream);
                    }

                    var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";
                    var imageUrl = $"{baseUrl}/uploads/{fileName}";
                    _logger.LogInformation($"Successfully saved image: {fileName}");

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

        private bool IsValidImageFormat(IImageFormat format)
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
}