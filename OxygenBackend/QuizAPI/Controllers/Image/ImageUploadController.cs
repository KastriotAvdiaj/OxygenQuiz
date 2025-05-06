using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp; // <-- Required for Image.Load
using System.IO;

namespace QuizAPI.Controllers.Image
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public ImageUploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("question")]
        public async Task<IActionResult> UploadQuestionImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            if (!IsImageFile(file))
                return BadRequest("Invalid file type");

            var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            await using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);

            try
            {
                using var image = SixLabors.ImageSharp.Image.Load(memoryStream); // <-- Uses SixLabors.ImageSharp
                if (image.Width > 2000 || image.Height > 2000)
                    return BadRequest("Image dimensions too large (max: 2000x2000)");

                memoryStream.Position = 0;

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                await using var fileStream = new FileStream(filePath, FileMode.Create);
                await memoryStream.CopyToAsync(fileStream);

                var imageUrl = $"/uploads/{fileName}";
                return Ok(new { url = imageUrl });
            }
            catch
            {
                return BadRequest("Invalid or corrupted image file.");
            }
        }

        private bool IsImageFile(IFormFile file)
        {
            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif" };
            return allowedTypes.Contains(file.ContentType);
        }
    }
}