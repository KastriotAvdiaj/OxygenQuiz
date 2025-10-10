using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.TestQuestions.Services
{
    public class TestQuestionService : ITestQuestionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TestQuestionService> _logger;

        public TestQuestionService(
            ApplicationDbContext context,
            ILogger<TestQuestionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<TestQuestionResponse> TestQuestionAsync(TestQuestionRequest request)
        {
            try
            {
                // 1️ Convert QuestionType string -> enum
                if (!Enum.TryParse<QuestionType>(request.QuestionType, true, out var questionTypeEnum))
                {
                    _logger.LogError("Invalid question type received: {QuestionType}", request.QuestionType);
                    throw new ArgumentException($"Invalid question type: {request.QuestionType}");
                }

                // 2️ Convert PointSystem string -> enum
                if (!Enum.TryParse<PointSystem>(request.PointSystem, true, out var pointSystemEnum))
                {
                    _logger.LogError("Invalid point system received: {PointSystem}", request.PointSystem);
                    throw new ArgumentException($"Invalid point system: {request.PointSystem}");
                }

                // Load the question based on type
                QuestionBase? question = await LoadQuestionAsync(request.QuestionId, questionTypeEnum);

                if (question == null)
                {
                    _logger.LogError("Question with ID {QuestionId} and type {QuestionType} not found",
                        request.QuestionId, request.QuestionType);
                    throw new KeyNotFoundException($"Question with ID {request.QuestionId} not found");
                }

                // Determine correctness
                bool isCorrect = await DetermineCorrectnessAsync(question, request);

                // Calculate score (only if correct and not timed out)
                int score = 0;
                if (isCorrect && !request.TimedOut)
                {
                    score = CalculateScore(request.TimeLimitInSeconds, request.TimeTaken, pointSystemEnum);
                }

                // Get correct answer for display
                string correctAnswer = GetCorrectAnswerDisplay(question);

                _logger.LogInformation(
                    "Test completed for Question {QuestionId}. IsCorrect: {IsCorrect}, Score: {Score}",
                    request.QuestionId, isCorrect, score);

                return new TestQuestionResponse
                {
                    IsCorrect = isCorrect,
                    Score = score,
                    CorrectAnswer = correctAnswer
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing question {QuestionId}", request.QuestionId);
                throw;
            }
        }

        #region Private Helper Methods

        private async Task<QuestionBase?> LoadQuestionAsync(int questionId, QuestionType questionType)
        {
            return questionType switch
            {
                QuestionType.MultipleChoice => await _context.MultipleChoiceQuestions
                    .Include(q => q.AnswerOptions)
                    .FirstOrDefaultAsync(q => q.Id == questionId),

                QuestionType.TrueFalse => await _context.TrueFalseQuestions
                    .FirstOrDefaultAsync(q => q.Id == questionId),

                QuestionType.TypeTheAnswer => await _context.TypeTheAnswerQuestions
                    .FirstOrDefaultAsync(q => q.Id == questionId),

                _ => null
            };
        }

        private async Task<bool> DetermineCorrectnessAsync(QuestionBase question, TestQuestionRequest request)
        {
            switch (question)
            {
                case MultipleChoiceQuestion mcq:
                    return await CheckMultipleChoiceAnswer(mcq, request);

                case TrueFalseQuestion tfq:
                    if (string.IsNullOrEmpty(request.Answer))
                        return false;

                    bool submittedBool = string.Equals(request.Answer, "True", StringComparison.OrdinalIgnoreCase);
                    return tfq.CorrectAnswer == submittedBool;

                case TypeTheAnswerQuestion taq:
                    if (string.IsNullOrEmpty(request.Answer))
                        return false;

                    var comparison = taq.IsCaseSensitive
                        ? StringComparison.Ordinal
                        : StringComparison.OrdinalIgnoreCase;

                    bool isExactMatch = string.Equals(taq.CorrectAnswer, request.Answer, comparison);

                    if (!isExactMatch && taq.AcceptableAnswers.Any())
                    {
                        return taq.AcceptableAnswers.Any(acceptable =>
                            string.Equals(acceptable, request.Answer, comparison));
                    }

                    return isExactMatch;

                default:
                    _logger.LogWarning("Unknown question type: {QuestionType}", question.GetType().Name);
                    return false;
            }
        }

        private async Task<bool> CheckMultipleChoiceAnswer(MultipleChoiceQuestion mcq, TestQuestionRequest request)
        {
            if (mcq.AllowMultipleSelections)
            {
                // Multiple selections allowed
                if (request.SelectedOptionIds == null || !request.SelectedOptionIds.Any())
                    return false;

                var correctOptionIds = await _context.AnswerOptions
                    .Where(o => o.QuestionId == mcq.Id && o.IsCorrect)
                    .Select(o => o.Id)
                    .ToListAsync();

                // Check if selected options exactly match correct options
                return request.SelectedOptionIds.OrderBy(x => x).SequenceEqual(correctOptionIds.OrderBy(x => x));
            }
            else
            {
                // Single selection
                if (!request.SelectedOptionId.HasValue)
                    return false;

                var correctOption = await _context.AnswerOptions
                    .FirstOrDefaultAsync(o => o.QuestionId == mcq.Id && o.IsCorrect);

                return correctOption?.Id == request.SelectedOptionId;
            }
        }

        private int CalculateScore(int timeLimitInSeconds, double timeTaken, PointSystem pointSystem)
        {
            const int BASE_POINTS = 10;
            const double MAX_TIME_BONUS_FACTOR = 0.5;

            _logger.LogDebug("=== TEST SCORE CALCULATION ===");
            _logger.LogDebug("Time Taken: {TimeTaken} seconds", timeTaken);
            _logger.LogDebug("Time Limit: {TimeLimit} seconds", timeLimitInSeconds);

            double timeBonus = 0;

            if (timeTaken >= 0 && timeLimitInSeconds > 0)
            {
                var timeRemainingSeconds = Math.Max(0, timeLimitInSeconds - timeTaken);
                _logger.LogDebug("Time Remaining: {TimeRemaining} seconds", timeRemainingSeconds);

                // Calculate the bonus as a percentage of the time remaining
                timeBonus = (timeRemainingSeconds / timeLimitInSeconds) * MAX_TIME_BONUS_FACTOR;
                _logger.LogDebug("Time Bonus: {TimeBonus}", timeBonus);
            }

            var pointsWithTimeBonus = (int)(BASE_POINTS * (1 + timeBonus));
            _logger.LogDebug("Points with time bonus: {PointsWithBonus}", pointsWithTimeBonus);

            var multiplier = pointSystem switch
            {
                PointSystem.Standard => 1,
                PointSystem.Double => 2,
                PointSystem.Quadruple => 4,
                _ => 1
            };
            _logger.LogDebug("Point System Multiplier: {Multiplier}x", multiplier);

            var finalScore = pointsWithTimeBonus * multiplier;
            _logger.LogDebug("Final Score: {FinalScore}", finalScore);

            var result = Math.Max(1, finalScore);
            _logger.LogInformation("Test score calculated: {Result}", result);

            return result;
        }

        private string GetCorrectAnswerDisplay(QuestionBase question)
        {
            return question switch
            {
                MultipleChoiceQuestion mcq => string.Join(", ",
                    mcq.AnswerOptions.Where(o => o.IsCorrect).Select(o => o.Text)),

                TrueFalseQuestion tfq => tfq.CorrectAnswer.ToString(),

                TypeTheAnswerQuestion taq => taq.CorrectAnswer,

                _ => "Unknown"
            };
        }

        #endregion
    }
}
