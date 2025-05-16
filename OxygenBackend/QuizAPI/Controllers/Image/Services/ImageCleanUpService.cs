namespace QuizAPI.Controllers.Image.Services
{

    public class ImageCleanUpService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ImageCleanUpService> _logger;
        private readonly TimeSpan _runInterval = TimeSpan.FromHours(24); // Run once per day

        public ImageCleanUpService(
            IServiceProvider serviceProvider,
            ILogger<ImageCleanUpService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Image cleanup service is starting");

            using var timer = new PeriodicTimer(_runInterval);

            // Run immediately on startup, then on the interval
            await RunCleanupAsync();

            while (await timer.WaitForNextTickAsync(stoppingToken) && !stoppingToken.IsCancellationRequested)
            {
                await RunCleanupAsync();
            }
        }

        private async Task RunCleanupAsync()
        {
            try
            {
                _logger.LogInformation("Running scheduled image cleanup");

                // Create a new scope to resolve scoped services
                using var scope = _serviceProvider.CreateScope();
                var imageService = scope.ServiceProvider.GetRequiredService<IImageService>();

                await imageService.CleanUpUnusedImagesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during image cleanup");
            }
        }
    }
}
