using AutoMapper;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class UserAnswerService : IUserAnswerService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserAnswerService> _logger;
        private readonly IMapper _mapper; // Add this

        public UserAnswerService(ApplicationDbContext context, ILogger<UserAnswerService> logger, IMapper mapper) // Add IMapper
        {
            _context = context;
            _logger = logger;
            _mapper = mapper; // Add this
        }

        public async Task<Result<UserAnswerDto>> SubmitAnswerAsync(UserAnswerCM model)
        {
            try
            {
                var session = await _context.QuizSessions.FirstOrDefaultAsync(s => s.Id == model.SessionId && s.EndTime == null);
                if (session == null) return Result<UserAnswerDto>.ValidationFailure("Session not found or already completed");

                var quizQuestion = await _context.QuizQuestions.Include(qq => qq.Question).FirstOrDefaultAsync(qq => qq.Id == model.QuizQuestionId);
                if (quizQuestion == null) return Result<UserAnswerDto>.ValidationFailure("Quiz question not found");

                var existingAnswer = await _context.UserAnswers.FirstOrDefaultAsync(ua => ua.SessionId == model.SessionId && ua.QuizQuestionId == model.QuizQuestionId);
                if (existingAnswer != null) return Result<UserAnswerDto>.ValidationFailure("Answer already submitted for this question");

                var validationResult = await ValidateAnswerAsync(model, quizQuestion);
                if (!validationResult.IsSuccess) return Result<UserAnswerDto>.ValidationFailure(validationResult.ErrorMessage!);

                var (isCorrect, score) = await CalculateScoreAsync(model, quizQuestion);

                // Map from creation model to entity
                var userAnswer = _mapper.Map<UserAnswer>(model);

                // Set calculated properties
                userAnswer.IsCorrect = isCorrect;
                userAnswer.Score = score;

                _context.UserAnswers.Add(userAnswer);
                await _context.SaveChangesAsync();

                var answerDto = await GetAnswerDtoAsync(userAnswer.Id);
                return Result<UserAnswerDto>.Success(answerDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting answer for session {SessionId}", model.SessionId);
                return Result<UserAnswerDto>.Failure("Failed to submit answer");
            }
        }

        public async Task<Result<UserAnswerDto>> UpdateAnswerAsync(int answerId, UserAnswerCM model)
        {
            try
            {
                var answer = await _context.UserAnswers
                    .Include(ua => ua.QuizSession)
                    .Include(ua => ua.QuizQuestion).ThenInclude(qq => qq.Question)
                    .FirstOrDefaultAsync(ua => ua.Id == answerId);

                if (answer == null) return Result<UserAnswerDto>.ValidationFailure("Answer not found");
                if (answer.QuizSession.EndTime.HasValue) return Result<UserAnswerDto>.ValidationFailure("Cannot update answer - session is completed");

                var validationResult = await ValidateAnswerAsync(model, answer.QuizQuestion);
                if (!validationResult.IsSuccess) return Result<UserAnswerDto>.ValidationFailure(validationResult.ErrorMessage!);

                var (isCorrect, score) = await CalculateScoreAsync(model, answer.QuizQuestion);

                // Use AutoMapper to map the changes from the model onto the existing entity
                _mapper.Map(model, answer);

                // Set calculated properties
                answer.IsCorrect = isCorrect;
                answer.Score = score;

                await _context.SaveChangesAsync();

                var answerDto = await GetAnswerDtoAsync(answerId);
                return Result<UserAnswerDto>.Success(answerDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating answer {AnswerId}", answerId);
                return Result<UserAnswerDto>.Failure("Failed to update answer");
            }
        }

        public async Task<Result> DeleteAnswerAsync(int answerId)
        {
            try
            {
                var answer = await _context.UserAnswers
                    .Include(ua => ua.QuizSession)
                    .FirstOrDefaultAsync(ua => ua.Id == answerId);

                if (answer == null)
                {
                    return Result.ValidationFailure("Answer not found");
                }

                // Check if session is still active
                if (answer.QuizSession.EndTime.HasValue)
                {
                    return Result.ValidationFailure("Cannot delete answer - session is completed");
                }

                _context.UserAnswers.Remove(answer);
                await _context.SaveChangesAsync();

                return Result.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting answer {AnswerId}", answerId);
                return Result.Failure("Failed to delete answer");
            }
        }

        // Other methods (GetSessionAnswersAsync, DeleteAnswerAsync, etc.) refactored similarly...
        public async Task<Result<List<UserAnswerDto>>> GetSessionAnswersAsync(Guid sessionId)
        {
            try
            {
                var answers = await _context.UserAnswers
                    .Include(ua => ua.QuizQuestion).ThenInclude(qq => qq.Question)
                    .Include(ua => ua.AnswerOption)
                    .Where(ua => ua.SessionId == sessionId)
                    .ToListAsync();

                var answerDtos = _mapper.Map<List<UserAnswerDto>>(answers); // Use AutoMapper
                return Result<List<UserAnswerDto>>.Success(answerDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving answers for session {SessionId}", sessionId);
                return Result<List<UserAnswerDto>>.Failure("Failed to retrieve session answers");
            }
        }

        private async Task<Result> ValidateAnswerAsync(UserAnswerCM model, QuizQuestion quizQuestion)
        {
            // For multiple choice questions, validate that selected option belongs to the question
            if (model.SelectedOptionId.HasValue)
            {
                var optionExists = await _context.AnswerOptions
                    .AnyAsync(ao => ao.Id == model.SelectedOptionId.Value && ao.QuestionId == quizQuestion.QuestionId);

                if (!optionExists)
                {
                    return Result.ValidationFailure("Selected option does not belong to this question");
                }
            }

            // For text-based questions, ensure submitted answer is provided
            if (!model.SelectedOptionId.HasValue && string.IsNullOrWhiteSpace(model.SubmittedAnswer))
            {
                return Result.ValidationFailure("Answer is required");
            }

            return Result.Success();
        }

        // This helper method encapsulates the query and uses the mapper
        private async Task<UserAnswerDto?> GetAnswerDtoAsync(int answerId)
        {
            var answer = await _context.UserAnswers
                .AsNoTracking()
                .Include(ua => ua.QuizQuestion).ThenInclude(qq => qq.Question)
                .Include(ua => ua.AnswerOption)
                .FirstOrDefaultAsync(ua => ua.Id == answerId);

            return answer == null ? null : _mapper.Map<UserAnswerDto>(answer);
        }
        private async Task<(bool isCorrect, int score)> CalculateScoreAsync(UserAnswerCM model, QuizQuestion quizQuestion)
        {
            var baseScore = GetBaseScore(quizQuestion.PointSystem);

            if (model.SelectedOptionId.HasValue)
            {
                // Multiple choice or true/false
                var option = await _context.AnswerOptions
                    .FirstOrDefaultAsync(ao => ao.Id == model.SelectedOptionId.Value);

                if (option?.IsCorrect == true)
                {
                    return (true, baseScore);
                }
            }
            else if (!string.IsNullOrWhiteSpace(model.SubmittedAnswer))
            {
                // Type the answer - compare with correct answer
                var correctAnswer = await _context.AnswerOptions
                    .Where(ao => ao.QuestionId == quizQuestion.QuestionId && ao.IsCorrect)
                    .Select(ao => ao.Text)
                    .FirstOrDefaultAsync();

                if (!string.IsNullOrWhiteSpace(correctAnswer) &&
                    string.Equals(model.SubmittedAnswer.Trim(), correctAnswer.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    return (true, baseScore);
                }
            }

            return (false, 0);
        }

        private static int GetBaseScore(PointSystem pointSystem)
        {
            return pointSystem switch
            {
                PointSystem.Standard => 1,
                PointSystem.Double => 2,
                PointSystem.Quadruple => 4,
                _ => 1
            };
        }
    }
}
