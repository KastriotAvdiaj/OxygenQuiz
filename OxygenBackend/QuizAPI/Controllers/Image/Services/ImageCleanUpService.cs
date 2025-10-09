namespace QuizAPI.Controllers.Image.Services
{
    public class ImageCleanUpService
    {
        private readonly IImageService _imageService;
        private readonly ILogger<ImageCleanUpService> _logger;

        public ImageCleanUpService(
            IImageService imageService,
            ILogger<ImageCleanUpService> logger)
        {
            _imageService = imageService;
            _logger = logger;
        }

        // This method will be called by Hangfire
        public async Task RunCleanupAsync()
        {
            try
            {
                _logger.LogInformation("Running scheduled image cleanup via Hangfire");
                await _imageService.CleanUpUnusedImagesAsync();
                _logger.LogInformation("Image cleanup completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during image cleanup");
                throw; // Let Hangfire handle the retry
            }
        }
    }
}