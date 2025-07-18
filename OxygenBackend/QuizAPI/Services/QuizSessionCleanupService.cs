using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;

namespace QuizAPI.Services
{
    public class QuizSessionCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<QuizSessionCleanupService> _logger;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromMinutes(5); // Run every 5 minutes
        private readonly TimeSpan _sessionTimeout = TimeSpan.FromMinutes(30); // Mark sessions as abandoned after 30 minutes of inactivity

        public QuizSessionCleanupService(IServiceProvider serviceProvider, ILogger<QuizSessionCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Quiz Session Cleanup Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupAbandonedSessionsAsync();
                    await Task.Delay(_cleanupInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Expected when cancellation is requested
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during quiz session cleanup");
                    // Continue running even if cleanup fails
                    await Task.Delay(_cleanupInterval, stoppingToken);
                }
            }

            _logger.LogInformation("Quiz Session Cleanup Service stopped");
        }

        private async Task CleanupAbandonedSessionsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            try
            {
                var cutoffTime = DateTime.UtcNow - _sessionTimeout;
                
                // Find sessions that are:
                // 1. Not completed
                // 2. Have a current question that started more than 30 minutes ago
                // 3. OR have no current question but were started more than 30 minutes ago and have no recent activity
                var abandonedSessions = await context.QuizSessions
                    .Where(s => !s.IsCompleted && 
                           ((s.CurrentQuestionStartTime.HasValue && s.CurrentQuestionStartTime.Value < cutoffTime) ||
                            (!s.CurrentQuestionStartTime.HasValue && s.StartTime < cutoffTime)))
                    .ToListAsync();

                if (abandonedSessions.Any())
                {
                    _logger.LogInformation("Found {Count} abandoned quiz sessions to clean up", abandonedSessions.Count);

                    foreach (var session in abandonedSessions)
                    {
                        // Mark session as completed (abandoned)
                        session.IsCompleted = true;
                        session.EndTime = DateTime.UtcNow;
                        session.CurrentQuizQuestionId = null;
                        session.CurrentQuestionStartTime = null;

                        _logger.LogDebug("Marked session {SessionId} as abandoned", session.Id);
                    }

                    await context.SaveChangesAsync();
                    _logger.LogInformation("Successfully cleaned up {Count} abandoned quiz sessions", abandonedSessions.Count);
                }
                else
                {
                    _logger.LogDebug("No abandoned quiz sessions found");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during quiz session cleanup operation");
                throw;
            }
        }
    }
}