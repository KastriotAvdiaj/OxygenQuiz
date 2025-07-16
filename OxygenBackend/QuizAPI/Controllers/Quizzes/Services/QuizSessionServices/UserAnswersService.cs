using AutoMapper;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class UserAnswerService : IUserAnswerService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserAnswerService> _logger;
        private readonly IMapper _mapper;

        public UserAnswerService(ApplicationDbContext context, ILogger<UserAnswerService> logger, IMapper mapper)
        {
            _context = context;
            _logger = logger;
            _mapper = mapper;
        }

        public async Task<Result<List<UserAnswerDto>>> GetSessionAnswersAsync(Guid sessionId)
        {
            try
            {
                var answers = await _context.UserAnswers
                    .AsNoTracking()
                    .Include(ua => ua.QuizQuestion).ThenInclude(qq => qq.Question)
                    .Include(ua => ua.AnswerOption)
                    .Where(ua => ua.SessionId == sessionId)
                    .ToListAsync();

                var answerDtos = _mapper.Map<List<UserAnswerDto>>(answers);
                return Result<List<UserAnswerDto>>.Success(answerDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving answers for session {SessionId}", sessionId);
                return Result<List<UserAnswerDto>>.Failure("Failed to retrieve session answers.");
            }
        }

        // This method should be protected by an authorization policy (e.g., Admin-only)
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