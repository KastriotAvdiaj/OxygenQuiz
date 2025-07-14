using AutoMapper; // Add this using
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;
using Microsoft.EntityFrameworkCore;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;

public class QuizSessionService : IQuizSessionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<QuizSessionService> _logger;
    private readonly IMapper _mapper; // Add this

    public QuizSessionService(ApplicationDbContext context, ILogger<QuizSessionService> logger, IMapper mapper) // Add IMapper
    {
        _context = context;
        _logger = logger;
        _mapper = mapper; // Add this
    }

    public async Task<Result<QuizSessionDto>> CreateSessionAsync(QuizSessionCM model)
    {
        try
        {
            var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == model.QuizId && q.IsActive && q.IsPublished);
            if (quiz == null)
            {
                return Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available");
            }

            var existingSession = await _context.QuizSessions.FirstOrDefaultAsync(s => s.QuizId == model.QuizId && s.UserId == model.UserId && s.EndTime == null);
            if (existingSession != null)
            {
                return Result<QuizSessionDto>.ValidationFailure("You already have an active session for this quiz");
            }

            // Use AutoMapper to create the base entity
            var session = _mapper.Map<QuizSession>(model);

            // Manually set properties not in the creation model
            session.Id = Guid.NewGuid();
            session.StartTime = DateTime.UtcNow;
            session.TotalScore = 0;

            _context.QuizSessions.Add(session);
            await _context.SaveChangesAsync();

            // Use our helper to get the fully loaded DTO
            var sessionDto = await GetSessionDtoAsync(session.Id);
            return Result<QuizSessionDto>.Success(sessionDto!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating quiz session for user {UserId} and quiz {QuizId}", model.UserId, model.QuizId);
            return Result<QuizSessionDto>.Failure("Failed to create quiz session");
        }
    }

    public async Task<Result<QuizSessionDto>> GetSessionAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.QuizSessions
                .Include(s => s.Quiz)
                .Include(s => s.UserAnswers)
                    .ThenInclude(ua => ua.QuizQuestion)
                        .ThenInclude(qq => qq.Question)
                .Include(s => s.UserAnswers)
                    .ThenInclude(ua => ua.AnswerOption)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null)
            {
                return Result<QuizSessionDto>.ValidationFailure("Quiz session not found");
            }

            var sessionDto = _mapper.Map<QuizSessionDto>(session); // Use AutoMapper
            return Result<QuizSessionDto>.Success(sessionDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quiz session {SessionId}", sessionId);
            return Result<QuizSessionDto>.Failure("Failed to retrieve quiz session");
        }
    }

    public async Task<Result<List<QuizSessionSummaryDto>>> GetUserSessionsAsync(Guid userId)
    {
        try
        {
            var sessions = await _context.QuizSessions
                .Include(s => s.Quiz)
                .Include(s => s.UserAnswers)
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.StartTime)
                .ToListAsync();

            var sessionDtos = _mapper.Map<List<QuizSessionSummaryDto>>(sessions); // Use AutoMapper
            return Result<List<QuizSessionSummaryDto>>.Success(sessionDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving sessions for user {UserId}", userId);
            return Result<List<QuizSessionSummaryDto>>.Failure("Failed to retrieve user sessions");
        }
    }

    public async Task<Result<QuizSessionDto>> CompleteSessionAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.QuizSessions
                .Include(s => s.UserAnswers)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null) return Result<QuizSessionDto>.ValidationFailure("Quiz session not found");
            if (session.EndTime.HasValue) return Result<QuizSessionDto>.ValidationFailure("Quiz session is already completed");

            session.EndTime = DateTime.UtcNow;
            session.TotalScore = session.UserAnswers.Sum(ua => ua.Score);

            await _context.SaveChangesAsync();

            var sessionDto = await GetSessionDtoAsync(sessionId);
            return Result<QuizSessionDto>.Success(sessionDto!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing quiz session {SessionId}", sessionId);
            return Result<QuizSessionDto>.Failure("Failed to complete quiz session");
        }
    }

    public async Task<Result> DeleteSessionAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.QuizSessions
                .Include(s => s.UserAnswers)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null) return Result.ValidationFailure("Quiz session not found");

            _context.QuizSessions.Remove(session);
            await _context.SaveChangesAsync();

            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting quiz session {SessionId}", sessionId);
            return Result.Failure("Failed to delete quiz session");
        }
    }

    // This helper is still very useful for centralizing the query logic.
    private async Task<QuizSessionDto?> GetSessionDtoAsync(Guid sessionId)
    {
        var session = await _context.QuizSessions
            .AsNoTracking() // Good practice for read-only queries
            .Include(s => s.Quiz)
            .Include(s => s.UserAnswers)
                .ThenInclude(ua => ua.QuizQuestion)
                    .ThenInclude(qq => qq.Question)
            .Include(s => s.UserAnswers)
                .ThenInclude(ua => ua.AnswerOption)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        return session == null ? null : _mapper.Map<QuizSessionDto>(session); // Use AutoMapper here
    }
}

