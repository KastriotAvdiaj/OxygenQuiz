using Hangfire;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices
{
    public class AnswerGradingService : IAnswerGradingService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AnswerGradingService> _logger;
        private readonly IBackgroundJobClient _backgroundJobClient;

        public AnswerGradingService(
            ApplicationDbContext context,
            ILogger<AnswerGradingService> logger,
            IBackgroundJobClient backgroundJobClient)
        {
            _context = context;
            _logger = logger;
            _backgroundJobClient = backgroundJobClient;
        }

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

                var (isCorrect, score) = await CalculateScoreAsync(quizQuestion.Question, userAnswer, quizQuestion, questionStartTime);

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

        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 5, 30, 60 })]
        public async Task ProcessAnswerGradingAsync(int userAnswerId, DateTime questionStartTime)
        {
            try
            {
                _logger.LogInformation("Processing background grading for UserAnswer {UserAnswerId}", userAnswerId);

                using var scope = _context.Database.BeginTransaction();

                var userAnswer = await _context.UserAnswers
                    .Include(ua => ua.QuizQuestion)
                        .ThenInclude(qq => qq.Question)
                    .Include(ua => ua.QuizSession)
                    .FirstOrDefaultAsync(ua => ua.Id == userAnswerId);

                if (userAnswer == null)
                {
                    _logger.LogError("UserAnswer {UserAnswerId} not found for background grading", userAnswerId);
                    return;
                }

                // Skip if already graded (in case of retry after partial success)
                if (userAnswer.Status != AnswerStatus.Pending)
                {
                    _logger.LogWarning("UserAnswer {UserAnswerId} already graded with status {Status}",
                        userAnswerId, userAnswer.Status);
                    return;
                }

                // Load additional data for multiple choice questions
                if (userAnswer.QuizQuestion.Question is MultipleChoiceQuestion)
                {
                    await _context.Entry(userAnswer.QuizQuestion.Question)
                        .Collection(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                        .LoadAsync();
                }

                var (isCorrect, score) = await CalculateScoreAsync(
                    userAnswer.QuizQuestion.Question,
                    userAnswer,
                    userAnswer.QuizQuestion,
                    questionStartTime);

                // Update the answer
                userAnswer.Status = isCorrect ? AnswerStatus.Correct : AnswerStatus.Incorrect;
                userAnswer.Score = score;

                // Update session total score
                userAnswer.QuizSession.TotalScore += score;

                await _context.SaveChangesAsync();
                await scope.CommitAsync();

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

        private async Task<(bool IsCorrect, int Score)> CalculateScoreAsync(
            QuestionBase question,
            UserAnswer answer,
            QuizQuestion quizQuestion,
            DateTime questionStartTime)
        {
            bool isCorrect = await DetermineCorrectnessAsync(question, answer);

            if (!isCorrect)
                return (false, 0);

            int score = CalculateScore(quizQuestion, answer, questionStartTime);
            return (true, score);
        }

        private async Task<bool> DetermineCorrectnessAsync(QuestionBase question, UserAnswer answer)
        {
            switch (question)
            {
                case MultipleChoiceQuestion mcq:
                    var correctOption = await _context.AnswerOptions
                        .AsNoTracking()
                        .FirstOrDefaultAsync(o => o.QuestionId == mcq.Id && o.IsCorrect);
                    return correctOption?.Id == answer.SelectedOptionId;

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

        private int CalculateScore(QuizQuestion quizQuestion, UserAnswer answer, DateTime questionStartTime)
        {
            const int BASE_POINTS = 10;
            double timeBonus = 0;

            var timeTaken = answer.SubmittedTime - questionStartTime;

            if (timeTaken.TotalSeconds > 0 && quizQuestion.TimeLimitInSeconds > 0)
            {
                var timeRemainingSeconds = Math.Max(0, quizQuestion.TimeLimitInSeconds - (int)timeTaken.TotalSeconds);
                timeBonus = (double)timeRemainingSeconds / quizQuestion.TimeLimitInSeconds * 0.5;
            }

            var pointsWithTimeBonus = (int)(BASE_POINTS * (1 + timeBonus));

            var multiplier = quizQuestion.PointSystem switch
            {
                PointSystem.Standard => 1,
                PointSystem.Double => 2,
                PointSystem.Quadruple => 4,
                _ => 1
            };

            var finalScore = pointsWithTimeBonus * multiplier;

            _logger.LogDebug("Score calculation - Base: {Base}, Time bonus: {TimeBonus:P}, Multiplier: {Multiplier}x, Final: {Final}",
                BASE_POINTS, timeBonus, multiplier, finalScore);

            return Math.Max(1, finalScore);
        }

        #endregion
    }
}