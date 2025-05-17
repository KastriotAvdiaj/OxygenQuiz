
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Image.Services
{
    public class ImageService : IImageService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<ImageService> _logger;

        public ImageService(
            ApplicationDbContext dbContext,
            IWebHostEnvironment env,
            ILogger<ImageService> logger)
        {
            _dbContext = dbContext;
            _env = env;
            _logger = logger;
        }

        public async Task<string> SaveImageAsync(Stream imageStream, string fileName, string format)
        {
            // Generate unique filename
            var uniqueFileName = $"{Guid.NewGuid()}.{format.ToLowerInvariant()}";
            var filePath = Path.Combine(_env.WebRootPath, "uploads", uniqueFileName);

            // Ensure directory exists
            var directory = Path.GetDirectoryName(filePath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // Save the file
            await using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await imageStream.CopyToAsync(fileStream);
            }

            // Record in database
            var imageAsset = new ImageAsset
            {
                FileName = uniqueFileName,
                OriginalFileName = fileName,
                FileFormat = format,
                FilePath = filePath,
                IsUsed = false,
                CreatedDate = DateTime.UtcNow
            };

            _dbContext.ImageAssets.Add(imageAsset);
            await _dbContext.SaveChangesAsync();

            // Generate URL
            var baseUrl = ""; // This will be filled from request context in the controller
            return $"{baseUrl}/uploads/{uniqueFileName}";
        }

        public async Task<bool> AssociateImageWithEntityAsync(string imageUrl, string entityType, int entityId)
        {
            // Extract filename from URL
            var fileName = Path.GetFileName(imageUrl);

            // Find image in database
            var image = await _dbContext.ImageAssets
                .FirstOrDefaultAsync(img => img.FileName == fileName);

            if (image == null)
            {
                _logger.LogWarning($"Attempted to associate non-existent image: {fileName}");
                return false;
            }

            // Update image record
            image.IsUsed = true;
            image.EntityType = entityType;
            image.EntityId = entityId;
            image.LastModifiedDate = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task DeleteAssociatedImageAsync(string imageUrl, string entityType, int entityId)
        {
            try
            {
                // Extract the filename from the URL
                var fileName = Path.GetFileName(new Uri(imageUrl).AbsolutePath);

                // Find the image asset
                var imageAsset = await _dbContext.ImageAssets
                    .FirstOrDefaultAsync(img => img.FileName == fileName &&
                                              img.EntityType == entityType &&
                                              img.EntityId == entityId);

                if (imageAsset != null)
                {
                    // Delete the physical file
                    var filePath = Path.Combine(_env.WebRootPath, "uploads", fileName);
                    if (File.Exists(filePath))
                    {
                        File.Delete(filePath);
                    }

                    // Remove the database record
                    _dbContext.ImageAssets.Remove(imageAsset);
                    // Note: We don't SaveChanges here as it will be handled in the calling method
                }
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the question deletion
                _logger.LogError(ex, $"Error deleting image for question {entityId}");
            }
        }

        public async Task<int> CleanUpUnusedImagesAsync()
        {
            // Find images that are unused and older than 24 hours
            var cutoffTime = DateTime.UtcNow.AddHours(-24);
            var unusedImages = await _dbContext.ImageAssets
                .Where(img => !img.IsUsed && img.CreatedDate < cutoffTime)
                .ToListAsync();

            if (!unusedImages.Any())
            {
                _logger.LogInformation("No unused images found to clean up");
                return 0;
            }

            int deletedCount = 0;

            foreach (var image in unusedImages)
            {
                try
                {
                    // Delete physical file
                    var filePath = Path.Combine(_env.WebRootPath, "uploads", image.FileName);
                    if (File.Exists(filePath))
                    {
                        File.Delete(filePath);
                        deletedCount++;
                    }

                    // Remove from database
                    _dbContext.ImageAssets.Remove(image);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error deleting image {image.FileName}");
                }
            }

            await _dbContext.SaveChangesAsync();
            _logger.LogInformation($"Cleaned up {deletedCount} unused images");

            return deletedCount;
        }
    }
}