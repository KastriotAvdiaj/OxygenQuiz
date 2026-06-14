using Hangfire;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Scoring;

namespace QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices
{
    public class AnswerGradingService : IAnswerGradingService
    {
        private readonly ApplicationDbContext _context; // Keep for synchronous operations
        private readonly IServiceScopeFactory _scopeFactory; // Add for background operations
        private readonly ILogger<AnswerGradingService> _logger;
        private readonly IBackgroundJobClient _backgroundJobClient;

        public AnswerGradingService(
            ApplicationDbContext context, // Keep this for instant grading
            IServiceScopeFactory scopeFactory, // Add this for background grading
            ILogger<AnswerGradingService> logger,
            IBackgroundJobClient backgroundJobClient)
        {
            _context = context;
            _scopeFactory = scopeFactory;
            _logger = logger;
            _backgroundJobClient = backgroundJobClient;
        }

        // This method is used for INSTANT feedback - uses injected context
        public async Task<GradingResult> GradeAnswerAsync(int quizQuestionId, UserAnswer userAnswer, DateTime questionStartTime)
        {
            try
            {
                var quizQuestion = await _context.QuizQuestions
                    .Include(qq => qq.Question)
                    .FirstOrDefaultAsync(qq => qq.Id == quizQuestionId);

                if (quizQuestion == null)
                {
                    _logger.LogError("QuizQuestion with ID {QuizQuestionId} not found", quizQuestionId);
                    return new GradingResult { IsCorrect = false, Score = 0, Status = AnswerStatus.Incorrect };
                }

                // Load additional data for multiple choice questions
                if (quizQuestion.Question is MultipleChoiceQuestion)
                {
                    await _context.Entry(quizQuestion.Question)
                        .Collection(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                        .LoadAsync();
                }

                var (isCorrect, score) = await CalculateScoreAsync(_context, quizQuestion.Question, userAnswer, quizQuestion);

                var status = isCorrect ? AnswerStatus.Correct : AnswerStatus.Incorrect;

                // Check if answer was timed out (this should have been set before calling this method)
                if (userAnswer.Status == AnswerStatus.TimedOut)
                {
                    status = AnswerStatus.TimedOut;
                    score = 0;
                }

                return new GradingResult
                {
                    IsCorrect = isCorrect,
                    Score = score,
                    Status = status
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error grading answer for QuizQuestion {QuizQuestionId}", quizQuestionId);
                throw;
            }
        }

        public void EnqueueAnswerGrading(int userAnswerId, DateTime questionStartTime)
        {
            try
            {
                // Enqueue with retry policy
                var jobId = _backgroundJobClient.Enqueue(() =>
                    ProcessAnswerGradingAsync(userAnswerId, questionStartTime));

                _logger.LogInformation("Enqueued grading job {JobId} for UserAnswer {UserAnswerId}",
                    jobId, userAnswerId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to enqueue grading job for UserAnswer {UserAnswerId}", userAnswerId);
                // Consider fallback to synchronous grading here if critical
                throw;
            }
        }

        // This method is used for BACKGROUND processing - creates its own scope
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 5, 30, 60 })]
        public async Task ProcessAnswerGradingAsync(int userAnswerId, DateTime questionStartTime)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            try
            {
                _logger.LogInformation("Processing background grading for UserAnswer {UserAnswerId}", userAnswerId);

                UserAnswer? userAnswer = null;

                // Defense in depth: Handle edge cases where data might not be immediately visible
                for (int attempt = 1; attempt <= 5; attempt++)
                {
                    userAnswer = await context.UserAnswers
                        .Include(ua => ua.QuizQuestion)
                            .ThenInclude(qq => qq.Question)
                        .Include(ua => ua.QuizSession)
                        .FirstOrDefaultAsync(ua => ua.Id == userAnswerId);

                    if (userAnswer != null)
                    {
                        if (attempt > 1)
                        {
                            _logger.LogWarning("Required {Attempts} attempts to find UserAnswer {UserAnswerId} - investigate potential issues",
                                attempt, userAnswerId);
                        }
                        break;
                    }

                    _logger.LogWarning("UserAnswer {UserAnswerId} not found on attempt {Attempt}/5, waiting {DelayMs}ms...",
                        userAnswerId, attempt, 500 * attempt);

                    await Task.Delay(500 * attempt); // Progressive delay: 500ms, 1s, 1.5s, 2s, 2.5s
                }

                if (userAnswer == null)
                {
                    _logger.LogError("UserAnswer {UserAnswerId} not found after 5 attempts - this should not happen with the new flow", userAnswerId);
                    return; // Let Hangfire retry the entire job
                }

                // Skip if already graded (in case of retry after partial success)
                if (userAnswer.Status != AnswerStatus.Pending)
                {
                    _logger.LogWarning("UserAnswer {UserAnswerId} already graded with status {Status}",
                        userAnswerId, userAnswer.Status);
                    return;
                }

                using var transaction = await context.Database.BeginTransactionAsync();

                // Load additional data for multiple choice questions
                if (userAnswer.QuizQuestion.Question is MultipleChoiceQuestion)
                {
                    await context.Entry(userAnswer.QuizQuestion.Question)
                        .Collection(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                        .LoadAsync();
                }

                var (isCorrect, score) = await CalculateScoreAsync(
                    context, // Use the scoped context
                    userAnswer.QuizQuestion.Question,
                    userAnswer,
                    userAnswer.QuizQuestion);

                // Update the answer
                userAnswer.Status = isCorrect ? AnswerStatus.Correct : AnswerStatus.Incorrect;
                userAnswer.Score = score;

                // Update session total score
                userAnswer.QuizSession.TotalScore += score;

                await context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully graded UserAnswer {UserAnswerId}. Score: {Score}, Status: {Status}",
                    userAnswerId, score, userAnswer.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in background grading for UserAnswer {UserAnswerId}", userAnswerId);
                throw; // Let Hangfire handle retries
            }
        }

        public async Task<bool> AreAllAnswersGradedAsync(Guid sessionId)
        {
            var pendingCount = await _context.UserAnswers
                .CountAsync(ua => ua.SessionId == sessionId && ua.Status == AnswerStatus.Pending);

            return pendingCount == 0;
        }

        public async Task<SessionGradingStatus> GetSessionGradingStatusAsync(Guid sessionId)
        {
            var answers = await _context.UserAnswers
                .Where(ua => ua.SessionId == sessionId)
                .Select(ua => ua.Status)
                .ToListAsync();

            return new SessionGradingStatus
            {
                TotalAnswers = answers.Count,
                GradedAnswers = answers.Count(s => s != AnswerStatus.Pending)
            };
        }

        #region Private Helper Methods

        // Multi-select answers arrive as a comma-separated list of option ids in SubmittedAnswer
        // (e.g. "11,9"); single-select answers use SelectedOptionId. Returns the chosen option ids.
        private static HashSet<int> ParseSelectedOptionIds(UserAnswer answer)
        {
            if (!string.IsNullOrWhiteSpace(answer.SubmittedAnswer))
            {
                var ids = answer.SubmittedAnswer
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(s => int.TryParse(s, out _))
                    .Select(int.Parse)
                    .ToHashSet();
                if (ids.Count > 0) return ids;
            }

            return answer.SelectedOptionId.HasValue
                ? new HashSet<int> { answer.SelectedOptionId.Value }
                : new HashSet<int>();
        }

        // Modified to accept context parameter for both sync and async operations
        private async Task<(bool IsCorrect, int Score)> CalculateScoreAsync(
            ApplicationDbContext context,
            QuestionBase question,
            UserAnswer answer,
            QuizQuestion quizQuestion)
        {
            bool isCorrect = await DetermineCorrectnessAsync(context, question, answer);

            if (!isCorrect)
                return (false, 0);

            int score = CalculateScore(quizQuestion, answer);
            return (true, score);
        }

        private async Task<bool> DetermineCorrectnessAsync(ApplicationDbContext context, QuestionBase question, UserAnswer answer)
        {
            switch (question)
            {
                case MultipleChoiceQuestion mcq:
                    var correctIds = (await context.AnswerOptions
                        .AsNoTracking()
                        .Where(o => o.QuestionId == mcq.Id && o.IsCorrect)
                        .Select(o => o.Id)
                        .ToListAsync()).ToHashSet();

                    if (mcq.AllowMultipleSelections)
                    {
                        // All-or-nothing: the chosen set must match the correct set exactly —
                        // every correct option selected and no incorrect ones.
                        var selectedIds = ParseSelectedOptionIds(answer);
                        return selectedIds.Count > 0 && selectedIds.SetEquals(correctIds);
                    }

                    // Single-answer: the one chosen option must be a correct option.
                    return answer.SelectedOptionId.HasValue
                        && correctIds.Contains(answer.SelectedOptionId.Value);

                case TrueFalseQuestion tfq:
                    bool submittedBool = string.Equals(answer.SubmittedAnswer, "True", StringComparison.OrdinalIgnoreCase);
                    return tfq.CorrectAnswer == submittedBool;

                case TypeTheAnswerQuestion taq:
                    var comparison = taq.IsCaseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;
                    bool isExactMatch = string.Equals(taq.CorrectAnswer, answer.SubmittedAnswer, comparison);

                    if (!isExactMatch && taq.AcceptableAnswers.Any())
                    {
                        return taq.AcceptableAnswers.Any(acceptable =>
                            string.Equals(acceptable, answer.SubmittedAnswer, comparison));
                    }
                    return isExactMatch;

                default:
                    _logger.LogWarning("Unknown question type: {QuestionType}", question.GetType().Name);
                    return false;
            }
        }

        // Speed-weighted scoring now lives in the shared QuizScoring helper, so single-player and
        // multiplayer stay in lockstep. This method just supplies the timing + point system and
        // keeps the "no submitted time ⇒ 0" guard.
        private int CalculateScore(QuizQuestion quizQuestion, UserAnswer answer)
        {
            if (!answer.SubmittedTime.HasValue)
            {
                _logger.LogDebug("No submitted time - returning 0 points");
                return 0;
            }

            var timeTaken = answer.SubmittedTime.Value - answer.QuestionStartTime;
            var result = QuizScoring.PointsForCorrectAnswer(
                timeTaken, quizQuestion.TimeLimitInSeconds, quizQuestion.PointSystem);

            _logger.LogInformation(
                "Score calculated: {Result} (timeTaken {TimeTaken}s, limit {Limit}s, system {System})",
                result, timeTaken.TotalSeconds, quizQuestion.TimeLimitInSeconds, quizQuestion.PointSystem);

            return result;
        }

        #endregion
    }
}