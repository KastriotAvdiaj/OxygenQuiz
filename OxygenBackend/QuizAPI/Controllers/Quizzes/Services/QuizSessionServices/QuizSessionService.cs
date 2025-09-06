using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.ManyToManyTables;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class QuizSessionService : IQuizSessionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<QuizSessionService> _logger;
        private readonly IMapper _mapper;
        private readonly ISessionAbandonmentService _abandonmentService;
        private readonly QuizSessionOptions _options;

        public QuizSessionService(
            ApplicationDbContext context,
            ILogger<QuizSessionService> logger,
            IMapper mapper,
            ISessionAbandonmentService abandonmentService,
            IOptions<QuizSessionOptions> options)
        {
            _context = context;
            _logger = logger;
            _mapper = mapper;
            _abandonmentService = abandonmentService;
            _options = options.Value;
        }

        #region Live Quiz Flow

        public async Task<Result<QuizStateDto>> GetCurrentStateAsync(Guid sessionId)
        {
            try
            {
                var session = await _context.QuizSessions
                    .AsNoTracking()
                    .Include(s => s.CurrentQuizQuestion)
                        .ThenInclude(qq => qq!.Question)
                    .FirstOrDefaultAsync(s => s.Id == sessionId);

                if (session == null)
                {
                    return Result<QuizStateDto>.ValidationFailure("Session not found.");
                }

                // Check for abandonment first
                if (await _abandonmentService.IsSessionAbandonedAsync(session))
                {
                    // Mark as abandoned and return completed state
                    await _context.QuizSessions
                        .Where(s => s.Id == sessionId)
                        .ExecuteUpdateAsync(s => s
                            .SetProperty(x => x.IsCompleted, true)
                            .SetProperty(x => x.EndTime, DateTime.UtcNow)
                            .SetProperty(x => x.CurrentQuizQuestionId, (int?)null)
                            .SetProperty(x => x.CurrentQuestionStartTime, (DateTime?)null));

                    return Result<QuizStateDto>.Success(new QuizStateDto { Status = LiveQuizStatus.Completed });
                }

                // Load additional data for current question if needed
                if (session.CurrentQuizQuestion?.Question is MultipleChoiceQuestion)
                {
                    await _context.Entry(session.CurrentQuizQuestion.Question)
                        .Collection(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                        .LoadAsync();
                }

                var stateDto = new QuizStateDto();

                if (session.IsCompleted)
                {
                    stateDto.Status = LiveQuizStatus.Completed;
                    return Result<QuizStateDto>.Success(stateDto);
                }

                if (session.CurrentQuizQuestionId != null && session.CurrentQuestionStartTime.HasValue)
                {
                    stateDto.Status = LiveQuizStatus.InProgress;
                    var activeQuestionDto = _mapper.Map<CurrentQuestionDto>(session.CurrentQuizQuestion);

                    var timeTaken = DateTime.UtcNow - session.CurrentQuestionStartTime.Value;
                    var timeRemaining = activeQuestionDto.TimeLimitInSeconds - (int)timeTaken.TotalSeconds;
                    activeQuestionDto.TimeRemainingInSeconds = Math.Max(0, timeRemaining);

                    stateDto.ActiveQuestion = activeQuestionDto;
                    return Result<QuizStateDto>.Success(stateDto);
                }

                stateDto.Status = LiveQuizStatus.BetweenQuestions;
                return Result<QuizStateDto>.Success(stateDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current state for session {SessionId}", sessionId);
                return Result<QuizStateDto>.Failure("An error occurred while fetching the session state.");
            }
        }

        public async Task<Result<CurrentQuestionDto>> GetNextQuestionAsync(Guid sessionId)
        {
            try
            {
                _logger.LogInformation("Getting next question for session {SessionId}", sessionId);

                var session = await _context.QuizSessions
                    .Include(s => s.Quiz)
                        .ThenInclude(q => q.QuizQuestions)
                    .Include(s => s.UserAnswers)
                    .FirstOrDefaultAsync(s => s.Id == sessionId);

                if (session == null)
                {
                    return Result<CurrentQuestionDto>.ValidationFailure("Session not found.");
                }

                if (session.IsCompleted)
                {
                    return Result<CurrentQuestionDto>.ValidationFailure("This quiz session is already completed.");
                }

                if (session.CurrentQuizQuestionId != null)
                {
                    return Result<CurrentQuestionDto>.ValidationFailure("An answer for the current question is still pending.");
                }

                var answeredQuestionIds = session.UserAnswers.Select(ua => ua.QuizQuestionId).ToHashSet();
                var nextQuizQuestion = session.Quiz.QuizQuestions
                    .Where(qq => !answeredQuestionIds.Contains(qq.Id))
                    .OrderBy(qq => qq.OrderInQuiz)
                    .FirstOrDefault();

                if (nextQuizQuestion == null)
                {
                    return Result<CurrentQuestionDto>.ValidationFailure("No more questions available.");
                }

                // Use transaction for atomic update
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    session.CurrentQuizQuestionId = nextQuizQuestion.Id;
                    session.CurrentQuestionStartTime = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }

                var fullQuestionForMapping = await _context.QuizQuestions
                    .Include(qq => qq.Question)
                    .FirstAsync(qq => qq.Id == nextQuizQuestion.Id);

                if (fullQuestionForMapping.Question is MultipleChoiceQuestion)
                {
                    await _context.Entry(fullQuestionForMapping.Question)
                        .Collection(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                        .LoadAsync();
                }

                var questionDto = _mapper.Map<CurrentQuestionDto>(fullQuestionForMapping);
                questionDto.TimeRemainingInSeconds = questionDto.TimeLimitInSeconds;

                return Result<CurrentQuestionDto>.Success(questionDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting next question for session {SessionId}", sessionId);
                return Result<CurrentQuestionDto>.Failure("An error occurred while fetching the next question.");
            }
        }

        public async Task<Result<AnswerResultDto>> SubmitAnswerAsync(UserAnswerCM model)
        {
            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                var session = await _context.QuizSessions
                    .Include(s => s.CurrentQuizQuestion)
                        .ThenInclude(qq => qq!.Question)
                    .FirstOrDefaultAsync(s => s.Id == model.SessionId);

                if (session == null)
                    return Result<AnswerResultDto>.ValidationFailure("Session not found.");
                if (session.IsCompleted)
                    return Result<AnswerResultDto>.ValidationFailure("This quiz session is already completed.");
                if (session.CurrentQuizQuestionId == null || session.CurrentQuestionStartTime == null)
                    return Result<AnswerResultDto>.ValidationFailure("Not currently expecting an answer. Please request the next question.");
                if (session.CurrentQuizQuestionId != model.QuizQuestionId)
                    return Result<AnswerResultDto>.ValidationFailure("Submitted answer is for the wrong question.");

                var timeLimit = session.CurrentQuizQuestion!.TimeLimitInSeconds + _options.GracePeriodSeconds;
                var timeTaken = DateTime.UtcNow - session.CurrentQuestionStartTime.Value;

                var userAnswer = _mapper.Map<UserAnswer>(model);
                userAnswer.SubmittedTime = DateTime.UtcNow;

                // Handle True/False questions
                if (session.CurrentQuizQuestion.Question is TrueFalseQuestion)
                {
                    var originalSelectedOptionId = userAnswer.SelectedOptionId;
                    userAnswer.SelectedOptionId = null;
                    userAnswer.SubmittedAnswer = originalSelectedOptionId == 1 ? "True" : "False";
                }

                if (timeTaken.TotalSeconds > timeLimit)
                {
                    userAnswer.Status = AnswerStatus.TimedOut;
                    userAnswer.Score = 0;
                }
                else
                {
                    var (isCorrect, score) = await GradeAnswerAsync(session.CurrentQuizQuestion.Question, userAnswer, session.CurrentQuestionStartTime.Value);
                    userAnswer.Status = isCorrect ? AnswerStatus.Correct : AnswerStatus.Incorrect;
                    userAnswer.Score = score;
                }

                session.TotalScore += userAnswer.Score;
                session.CurrentQuizQuestionId = null;
                session.CurrentQuestionStartTime = null;

                _context.UserAnswers.Add(userAnswer);

                var totalQuestionsInQuiz = await _context.QuizQuestions.CountAsync(qq => qq.QuizId == session.QuizId);
                var answeredQuestions = await _context.UserAnswers.CountAsync(ua => ua.SessionId == session.Id) + 1; // +1 for current answer
                bool isQuizComplete = totalQuestionsInQuiz == answeredQuestions;

                if (isQuizComplete)
                {
                    session.IsCompleted = true;
                    session.EndTime = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var resultDto = new AnswerResultDto
                {
                    Status = userAnswer.Status,
                    ScoreAwarded = userAnswer.Score,
                    IsQuizComplete = isQuizComplete
                };

                return Result<AnswerResultDto>.Success(resultDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting answer for session {SessionId}", model.SessionId);
                return Result<AnswerResultDto>.Failure("An error occurred while submitting the answer.");
            }
        }

        #endregion

        #region Session Management

        public async Task<Result<QuizSessionDto>> CreateSessionAsync(QuizSessionCM model)
        {
            try
            {
                var quiz = await _context.Quizzes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(q => q.Id == model.QuizId && q.IsActive && q.IsPublished);

                if (quiz == null)
                    return Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available.");

                // Use abandonment service to check for existing sessions
                var existingActiveSession = await _abandonmentService.GetActiveSessionForUserAsync(model.UserId, model.QuizId);

                if (existingActiveSession != null)
                {
                    var timeSinceLastActivity = existingActiveSession.CurrentQuestionStartTime.HasValue
                        ? DateTime.UtcNow - existingActiveSession.CurrentQuestionStartTime.Value
                        : DateTime.UtcNow - existingActiveSession.StartTime;

                    return Result<QuizSessionDto>.ValidationFailure(
                        $"You already have an active session for this quiz. Last activity: {timeSinceLastActivity.TotalMinutes:F1} minutes ago.");
                }

                // Create new session
                var session = _mapper.Map<QuizSession>(model);
                session.Id = Guid.NewGuid();
                session.StartTime = DateTime.UtcNow;
                session.TotalScore = 0;
                session.IsCompleted = false;
                session.CurrentQuizQuestionId = null;
                session.CurrentQuestionStartTime = null;

                _context.QuizSessions.Add(session);
                await _context.SaveChangesAsync();

                var sessionDto = await GetSessionDtoAsync(session.Id);
                return Result<QuizSessionDto>.Success(sessionDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating quiz session for user {UserId} and quiz {QuizId}", model.UserId, model.QuizId);
                return Result<QuizSessionDto>.Failure("Failed to create quiz session.");
            }
        }

        public async Task<Result<QuizSessionDto>> GetSessionAsync(Guid sessionId)
        {
            try
            {
                var sessionDto = await GetSessionDtoAsync(sessionId);
                return sessionDto != null
                    ? Result<QuizSessionDto>.Success(sessionDto)
                    : Result<QuizSessionDto>.ValidationFailure("Quiz session not found.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving session {SessionId}", sessionId);
                return Result<QuizSessionDto>.Failure("Failed to retrieve session.");
            }
        }

        public async Task<Result<List<QuizSessionSummaryDto>>> GetUserSessionsAsync(Guid userId)
        {
            try
            {
                var sessions = await _context.QuizSessions
                    .AsNoTracking()
                    .Include(s => s.Quiz)
                        .ThenInclude(q => q.QuizQuestions)
                    .Include(s => s.UserAnswers)
                    .Where(s => s.UserId == userId)
                    .OrderByDescending(s => s.StartTime)
                    .ToListAsync();

                var sessionDtos = _mapper.Map<List<QuizSessionSummaryDto>>(sessions);
                return Result<List<QuizSessionSummaryDto>>.Success(sessionDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sessions for user {UserId}", userId);
                return Result<List<QuizSessionSummaryDto>>.Failure("Failed to retrieve user sessions.");
            }
        }

        public async Task<Result<QuizSessionDto>> CompleteSessionAsync(Guid sessionId)
        {
            try
            {
                var session = await _context.QuizSessions.FirstOrDefaultAsync(s => s.Id == sessionId);

                if (session == null)
                    return Result<QuizSessionDto>.ValidationFailure("Quiz session not found.");
                if (session.IsCompleted)
                    return Result<QuizSessionDto>.ValidationFailure("Quiz session is already completed.");

                session.EndTime = DateTime.UtcNow;
                session.IsCompleted = true;
                session.CurrentQuizQuestionId = null;
                session.CurrentQuestionStartTime = null;

                await _context.SaveChangesAsync();

                var sessionDto = await GetSessionDtoAsync(sessionId);
                return Result<QuizSessionDto>.Success(sessionDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing quiz session {SessionId}", sessionId);
                return Result<QuizSessionDto>.Failure("Failed to complete quiz session.");
            }
        }

        public async Task<Result<int>> CleanupAbandonedSessionsAsync()
        {
            try
            {
                // Delegate to abandonment service
                var cleanedCount = await _abandonmentService.CleanupAbandonedSessionsAsync();
                return Result<int>.Success(cleanedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during manual quiz session cleanup");
                return Result<int>.Failure("Failed to cleanup abandoned sessions.");
            }
        }

        public async Task<Result> DeleteSessionAsync(Guid sessionId)
        {
            try
            {
                var session = await _context.QuizSessions
                    .FirstOrDefaultAsync(s => s.Id == sessionId);

                if (session == null)
                    return Result.ValidationFailure("Quiz session not found.");

                _context.QuizSessions.Remove(session);
                await _context.SaveChangesAsync();

                return Result.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting quiz session {SessionId}", sessionId);
                return Result.Failure("Failed to delete quiz session.");
            }
        }

        #endregion

        #region Private Helper Methods

        private async Task<(bool IsCorrect, int Score)> GradeAnswerAsync(QuestionBase question, UserAnswer answer, DateTime questionStartTime)
        {
            bool isCorrect = false;

            switch (question)
            {
                case MultipleChoiceQuestion mcq:
                    var correctOption = await _context.AnswerOptions
                        .AsNoTracking()
                        .FirstOrDefaultAsync(o => o.QuestionId == mcq.Id && o.IsCorrect);
                    isCorrect = correctOption?.Id == answer.SelectedOptionId;
                    break;
                case TrueFalseQuestion tfq:
                    bool submittedBool = string.Equals(answer.SubmittedAnswer, "True", StringComparison.OrdinalIgnoreCase);
                    isCorrect = tfq.CorrectAnswer == submittedBool;
                    break;
                case TypeTheAnswerQuestion taq:
                    var comparison = taq.IsCaseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;
                    isCorrect = string.Equals(taq.CorrectAnswer, answer.SubmittedAnswer, comparison);

                    if (!isCorrect && taq.AcceptableAnswers.Any())
                    {
                        isCorrect = taq.AcceptableAnswers.Any(acceptable =>
                            string.Equals(acceptable, answer.SubmittedAnswer, comparison));
                    }
                    break;
            }

            if (!isCorrect) return (false, 0);

            var quizQuestion = await _context.QuizQuestions
                .AsNoTracking()
                .FirstOrDefaultAsync(qq => qq.Id == answer.QuizQuestionId);

            if (quizQuestion == null) return (true, 10);

            var score = CalculateScore(quizQuestion, answer, questionStartTime);
            return (true, score);
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

        private async Task<QuizSessionDto?> GetSessionDtoAsync(Guid sessionId)
        {
            var session = await _context.QuizSessions
                .AsNoTracking()
                .Include(s => s.Quiz)
                .Include(s => s.UserAnswers)
                    .ThenInclude(ua => ua.QuizQuestion)
                        .ThenInclude(qq => qq.Question)
                .Include(s => s.UserAnswers)
                    .ThenInclude(ua => ua.AnswerOption)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            return session == null ? null : _mapper.Map<QuizSessionDto>(session);
        }

        #endregion
    }
}