using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Mapping;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService
{
    public class UserAnswerService : IUserAnswerService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserAnswerService> _logger;

        public UserAnswerService(ApplicationDbContext context, ILogger<UserAnswerService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Result<List<UserAnswerDto>>> GetSessionAnswersAsync(Guid sessionId)
        {
            try
            {
                // Projected in SQL, not loaded and mapped: the compiled mapper this used silently
                // returned `AnswerOptions: []` for every multiple-choice answer, because the query
                // never included the options (known-issues.md, fixed 2026-09-26). The projection
                // also applies the answer-key gate, which reads QuizSession → Quiz.
                var answerDtos = await _context.UserAnswers
                    .AsNoTracking()
                    .Where(ua => ua.SessionId == sessionId)
                    .OrderBy(ua => ua.QuizQuestion.OrderInQuiz)
                    .Select(QuizSessionMappers.ProjectUserAnswer)
                    .ToListAsync();

                return Result<List<UserAnswerDto>>.Success(answerDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving answers for session {SessionId}", sessionId);
                return Result<List<UserAnswerDto>>.Failure("Failed to retrieve session answers.");
            }
        }

        // Admin-only: enforced by [Authorize(Roles = "Admin,SuperAdmin")] on the controller action.
        public async Task<Result> DeleteAnswerAsync(int answerId)
        {
            try
            {
                var answer = await _context.UserAnswers
                    .Include(ua => ua.QuizSession) // Include session to check its status
                    .FirstOrDefaultAsync(ua => ua.Id == answerId);

                if (answer == null)
                {
                    return Result.ValidationFailure("Answer not found.");
                }

                // IMPORTANT: You might want to allow deletion from completed sessions for admin cleanup,
                // but you should NOT allow deletion from a LIVE session.
                // This check assumes you can't delete from a live session.
                if (!answer.QuizSession.IsCompleted)
                {
                    return Result.ValidationFailure("Cannot delete an answer from an active quiz session.");
                }

                _context.UserAnswers.Remove(answer);
                await _context.SaveChangesAsync();

                return Result.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting answer {AnswerId}", answerId);
                return Result.Failure("Failed to delete answer.");
            }
        }
    }
}