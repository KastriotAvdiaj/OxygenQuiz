using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models.Quiz;


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
                // Get all incomplete sessions
                var incompleteSessions = await context.QuizSessions
                    .Where(s => !s.IsCompleted)
                    .Include(s => s.Quiz)
                        .ThenInclude(q => q.QuizQuestions)
                    .ToListAsync();

                var sessionsToCleanup = new List<QuizSession>();

                foreach (var session in incompleteSessions)
                {
                    // Calculate expected quiz duration based on question time limits
                    var totalQuizTimeInSeconds = session.Quiz.QuizQuestions.Sum(qq => qq.TimeLimitInSeconds) + (session.Quiz.QuizQuestions.Count * 5);
                    var expectedQuizDuration = TimeSpan.FromSeconds(totalQuizTimeInSeconds);
                    
                    var timeSinceStart = DateTime.UtcNow - session.StartTime;
                    var timeSinceLastActivity = session.CurrentQuestionStartTime.HasValue 
                        ? DateTime.UtcNow - session.CurrentQuestionStartTime.Value 
                        : timeSinceStart;

                    // Session is abandoned if:
                    // 1. Total time since start exceeds expected quiz duration + 100% buffer, OR
                    // 2. Time since last activity exceeds 2x the longest question time limit + 2 minutes buffer
                    var maxQuestionTime = session.Quiz.QuizQuestions.Any() ? session.Quiz.QuizQuestions.Max(qq => qq.TimeLimitInSeconds) : 300;
                    var activityTimeout = TimeSpan.FromSeconds(maxQuestionTime * 2 + 120); // 2x longest question + 2 minutes
                    var totalTimeout = expectedQuizDuration.Add(expectedQuizDuration); // +100% buffer for background cleanup

                    if (timeSinceStart > totalTimeout || timeSinceLastActivity > activityTimeout)
                    {
                        sessionsToCleanup.Add(session);
                        _logger.LogInformation("Session {SessionId} marked for cleanup - Total time: {TotalTime:F1}min, Activity time: {ActivityTime:F1}min, Expected duration: {ExpectedDuration:F1}min", 
                            session.Id, timeSinceStart.TotalMinutes, timeSinceLastActivity.TotalMinutes, expectedQuizDuration.TotalMinutes);
                    }
                }

                if (sessionsToCleanup.Any())
                {
                    _logger.LogInformation("Found {Count} abandoned quiz sessions to clean up", sessionsToCleanup.Count);

                    foreach (var session in sessionsToCleanup)
                    {
                        session.IsCompleted = true;
                        session.EndTime = DateTime.UtcNow;
                        session.CurrentQuizQuestionId = null;
                        session.CurrentQuestionStartTime = null;
                    }

                    await context.SaveChangesAsync();
                    _logger.LogInformation("Successfully cleaned up {Count} abandoned quiz sessions", sessionsToCleanup.Count);
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