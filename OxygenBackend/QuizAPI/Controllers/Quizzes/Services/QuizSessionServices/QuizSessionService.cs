using AutoMapper;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class QuizSessionService : IQuizSessionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<QuizSessionService> _logger;
        private readonly IMapper _mapper;

        public QuizSessionService(ApplicationDbContext context, ILogger<QuizSessionService> logger, IMapper mapper)
        {
            _context = context;
            _logger = logger;
            _mapper = mapper;
        }

        #region Live Quiz Flow

        public async Task<Result<QuizStateDto>> GetCurrentStateAsync(Guid sessionId)
        {
            try
            {
                // Find the session, including the question details needed for mapping
                var session = await _context.QuizSessions
                    .AsNoTracking()
                    .Include(s => s.CurrentQuizQuestion)
                        .ThenInclude(qq => qq!.Question)
                    .FirstOrDefaultAsync(s => s.Id == sessionId);

                // If we have a current question, load the specific question type data
                if (session?.CurrentQuizQuestion?.Question != null)
                {
                    var questionId = session.CurrentQuizQuestion.Question.Id;
                    
                    // Load answer options only for MultipleChoice questions
                    if (session.CurrentQuizQuestion.Question is MultipleChoiceQuestion)
                    {
                        await _context.Entry(session.CurrentQuizQuestion.Question)
                            .Collection(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                            .LoadAsync();
                    }
                    // True/False and TypeTheAnswer questions don't need additional loading
                }

                if (session == null)
                {
                    return Result<QuizStateDto>.ValidationFailure("Session not found.");
                }

                var stateDto = new QuizStateDto();

                // Case 1: The quiz is fully completed.
                if (session.IsCompleted)
                {
                    stateDto.Status = LiveQuizStatus.Completed;
                    return Result<QuizStateDto>.Success(stateDto);
                }

                // Case 2: A question is currently active (the page refresh scenario).
                if (session.CurrentQuizQuestionId != null && session.CurrentQuestionStartTime.HasValue)
                {
                    stateDto.Status = LiveQuizStatus.InProgress;

                    // Map the active question to a DTO
                    var activeQuestionDto = _mapper.Map<CurrentQuestionDto>(session.CurrentQuizQuestion);

                    // *** THE CRITICAL CALCULATION ***
                    var timeTaken = DateTime.UtcNow - session.CurrentQuestionStartTime.Value;
                    var timeRemaining = activeQuestionDto.TimeLimitInSeconds - (int)timeTaken.TotalSeconds;

                    // Ensure the remaining time is not negative.
                    activeQuestionDto.TimeRemainingInSeconds = Math.Max(0, timeRemaining);

                    stateDto.ActiveQuestion = activeQuestionDto;
                    return Result<QuizStateDto>.Success(stateDto);
                }

                // Case 3: The quiz is active but no question is currently being timed (user is between questions).
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
                    _logger.LogWarning("Session {SessionId} not found", sessionId);
                    return Result<CurrentQuestionDto>.ValidationFailure("Session not found.");
                }
                if (session.IsCompleted)
                {
                    _logger.LogWarning("Session {SessionId} is already completed", sessionId);
                    return Result<CurrentQuestionDto>.ValidationFailure("This quiz session is already completed.");
                }
                if (session.CurrentQuizQuestionId != null)
                {
                    _logger.LogWarning("Session {SessionId} has pending question {QuestionId}", sessionId, session.CurrentQuizQuestionId);
                    return Result<CurrentQuestionDto>.ValidationFailure("An answer for the current question is still pending.");
                }

                var answeredQuestionIds = session.UserAnswers.Select(ua => ua.QuizQuestionId).ToHashSet();
                var nextQuizQuestion = session.Quiz.QuizQuestions
                    .Where(qq => !answeredQuestionIds.Contains(qq.Id))
                    .OrderBy(qq => qq.OrderInQuiz)
                    .FirstOrDefault();

                if (nextQuizQuestion == null)
                {
                    session.IsCompleted = true;
                    session.EndTime = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return Result<CurrentQuestionDto>.ValidationFailure("Quiz has been completed. No more questions available.");
                }

                session.CurrentQuizQuestionId = nextQuizQuestion.Id;
                session.CurrentQuestionStartTime = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var fullQuestionForMapping = await _context.QuizQuestions
                    .Include(qq => qq.Question)
                    .FirstAsync(qq => qq.Id == nextQuizQuestion.Id);

                // Load answer options only for MultipleChoice questions
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
            const int GRACE_PERIOD_SECONDS = 2;

            try
            {
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

                var timeLimit = session.CurrentQuizQuestion!.TimeLimitInSeconds + GRACE_PERIOD_SECONDS;
                var timeTaken = DateTime.UtcNow - session.CurrentQuestionStartTime.Value;

                var userAnswer = _mapper.Map<UserAnswer>(model);
                userAnswer.SubmittedTime = DateTime.UtcNow;

                if (timeTaken.TotalSeconds > timeLimit)
                {
                    userAnswer.Status = AnswerStatus.TimedOut;
                    userAnswer.Score = 0;
                }
                else
                {
                    var (isCorrect, score) = await GradeAnswerAsync(session.CurrentQuizQuestion!.Question, userAnswer);
                    userAnswer.Status = isCorrect ? AnswerStatus.Correct : AnswerStatus.Incorrect;
                    userAnswer.Score = score;
                }

                session.TotalScore += userAnswer.Score;
                session.CurrentQuizQuestionId = null;
                session.CurrentQuestionStartTime = null;

                _context.UserAnswers.Add(userAnswer);
                await _context.SaveChangesAsync();

                var totalQuestionsInQuiz = await _context.QuizQuestions.CountAsync(qq => qq.QuizId == session.QuizId);
                var answeredQuestions = await _context.UserAnswers.CountAsync(ua => ua.SessionId == session.Id);
                bool isQuizComplete = totalQuestionsInQuiz == answeredQuestions;
                if (isQuizComplete)
                {
                    session.IsCompleted = true;
                    session.EndTime = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

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

        private async Task<(bool IsCorrect, int Score)> GradeAnswerAsync(QuestionBase question, UserAnswer answer)
        {
            bool isCorrect = false;
            int score = 10; // Placeholder: You should calculate this based on PointSystem

            switch (question)
            {
                case MultipleChoiceQuestion mcq:
                    var correctOption = await _context.AnswerOptions
                        .AsNoTracking()
                        .FirstOrDefaultAsync(o => o.QuestionId == mcq.Id && o.IsCorrect);
                    isCorrect = correctOption?.Id == answer.SelectedOptionId;
                    break;
                case TrueFalseQuestion tfq:
                    bool submittedBool = answer.SelectedOptionId == 1; 
                    isCorrect = tfq.CorrectAnswer == submittedBool;
                    break;
                case TypeTheAnswerQuestion taq:
                    // TypeTheAnswer questions store the correct answer directly in the question entity
                    if (taq.IsCaseSensitive)
                    {
                        isCorrect = string.Equals(taq.CorrectAnswer, answer.SubmittedAnswer, StringComparison.Ordinal);
                    }
                    else
                    {
                        isCorrect = string.Equals(taq.CorrectAnswer, answer.SubmittedAnswer, StringComparison.OrdinalIgnoreCase);
                    }
                    
                    // Also check acceptable answers if any are defined
                    if (!isCorrect && taq.AcceptableAnswers.Any())
                    {
                        var comparison = taq.IsCaseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;
                        isCorrect = taq.AcceptableAnswers.Any(acceptable => 
                            string.Equals(acceptable, answer.SubmittedAnswer, comparison));
                    }
                    break;
            }

            return (isCorrect, isCorrect ? score : 0);
        }

        #endregion

        #region Session Management

        public async Task<Result<QuizSessionDto>> CreateSessionAsync(QuizSessionCM model)
        {
            try
            {
                var quiz = await _context.Quizzes.AsNoTracking().FirstOrDefaultAsync(q => q.Id == model.QuizId && q.IsActive && q.IsPublished);
                if (quiz == null)
                    return Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available.");

                // Check for existing sessions and provide detailed information
                var existingSessions = await _context.QuizSessions.AsNoTracking()
                    .Where(s => s.QuizId == model.QuizId && s.UserId == model.UserId)
                    .ToListAsync();

                var activeSession = existingSessions.FirstOrDefault(s => !s.IsCompleted);
                if (activeSession != null)
                {
                    // Log details about the active session for debugging
                    _logger.LogWarning("User {UserId} attempted to create new session for quiz {QuizId} but has active session {SessionId}. " +
                                     "Session started: {StartTime}, Current question start: {CurrentQuestionStart}, IsCompleted: {IsCompleted}",
                                     model.UserId, model.QuizId, activeSession.Id, activeSession.StartTime, 
                                     activeSession.CurrentQuestionStartTime, activeSession.IsCompleted);

                    // Calculate the expected quiz duration based on question time limits
                    var quizQuestions = await _context.QuizQuestions
                        .Where(qq => qq.QuizId == model.QuizId)
                        .ToListAsync();
                    
                    var totalQuizTimeInSeconds = quizQuestions.Sum(qq => qq.TimeLimitInSeconds) + (quizQuestions.Count * 5); // 5 seconds grace per question
                    var expectedQuizDuration = TimeSpan.FromSeconds(totalQuizTimeInSeconds);
                    
                    // Check if this session should be considered abandoned based on actual quiz duration
                    var timeSinceStart = DateTime.UtcNow - activeSession.StartTime;
                    var timeSinceLastActivity = activeSession.CurrentQuestionStartTime.HasValue 
                        ? DateTime.UtcNow - activeSession.CurrentQuestionStartTime.Value 
                        : timeSinceStart;

                    // Session is abandoned if:
                    // 1. Total time since start exceeds expected quiz duration + 50% buffer, OR
                    // 2. Time since last activity exceeds 2x the longest question time limit + 1 minute buffer
                    var maxQuestionTime = quizQuestions.Any() ? quizQuestions.Max(qq => qq.TimeLimitInSeconds) : 300; // Default 5 minutes
                    var activityTimeout = TimeSpan.FromSeconds(maxQuestionTime * 2 + 60); // 2x longest question + 1 minute
                    var totalTimeout = expectedQuizDuration.Add(TimeSpan.FromMinutes(expectedQuizDuration.TotalMinutes * 0.5)); // +50% buffer

                    if (timeSinceStart > totalTimeout || timeSinceLastActivity > activityTimeout)
                    {
                        _logger.LogInformation("Marking abandoned session {SessionId} as completed due to inactivity", activeSession.Id);
                        
                        // Mark the abandoned session as completed
                        var sessionToComplete = await _context.QuizSessions.FirstOrDefaultAsync(s => s.Id == activeSession.Id);
                        if (sessionToComplete != null)
                        {
                            sessionToComplete.IsCompleted = true;
                            sessionToComplete.EndTime = DateTime.UtcNow;
                            sessionToComplete.CurrentQuizQuestionId = null;
                            sessionToComplete.CurrentQuestionStartTime = null;
                            await _context.SaveChangesAsync();
                            _logger.LogInformation("Successfully marked session {SessionId} as completed", activeSession.Id);
                        }
                    }
                    else
                    {
                        return Result<QuizSessionDto>.ValidationFailure($"You already have an active session for this quiz. Last activity: {timeSinceLastActivity.TotalMinutes:F1} minutes ago.");
                    }
                }

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
            var sessionDto = await GetSessionDtoAsync(sessionId);
            return sessionDto != null
                ? Result<QuizSessionDto>.Success(sessionDto)
                : Result<QuizSessionDto>.ValidationFailure("Quiz session not found.");
        }

        public async Task<Result<List<QuizSessionSummaryDto>>> GetUserSessionsAsync(Guid userId)
        {
            try
            {
                var sessions = await _context.QuizSessions
                    .AsNoTracking()
                    .Include(s => s.Quiz)
                        .ThenInclude(q => q.QuizQuestions) // Required for TotalQuestions mapping
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
                // Get all incomplete sessions
                var incompleteSessions = await _context.QuizSessions
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

                    // More aggressive cleanup for manual trigger - 25% buffer instead of 50%
                    var maxQuestionTime = session.Quiz.QuizQuestions.Any() ? session.Quiz.QuizQuestions.Max(qq => qq.TimeLimitInSeconds) : 300;
                    var activityTimeout = TimeSpan.FromSeconds(maxQuestionTime * 1.5 + 60); // 1.5x longest question + 1 minute
                    var totalTimeout = expectedQuizDuration.Add(TimeSpan.FromMinutes(expectedQuizDuration.TotalMinutes * 0.25)); // +25% buffer for manual cleanup

                    if (timeSinceStart > totalTimeout || timeSinceLastActivity > activityTimeout)
                    {
                        sessionsToCleanup.Add(session);
                        _logger.LogInformation("Manual cleanup - Session {SessionId} marked for cleanup - Total time: {TotalTime:F1}min, Activity time: {ActivityTime:F1}min, Expected duration: {ExpectedDuration:F1}min", 
                            session.Id, timeSinceStart.TotalMinutes, timeSinceLastActivity.TotalMinutes, expectedQuizDuration.TotalMinutes);
                    }
                }

                if (sessionsToCleanup.Any())
                {
                    _logger.LogInformation("Manual cleanup - Found {Count} abandoned quiz sessions to clean up", sessionsToCleanup.Count);

                    foreach (var session in sessionsToCleanup)
                    {
                        session.IsCompleted = true;
                        session.EndTime = DateTime.UtcNow;
                        session.CurrentQuizQuestionId = null;
                        session.CurrentQuestionStartTime = null;
                    }

                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Manual cleanup - Successfully cleaned up {Count} abandoned quiz sessions", sessionsToCleanup.Count);
                    return Result<int>.Success(sessionsToCleanup.Count);
                }

                _logger.LogInformation("Manual cleanup - No abandoned quiz sessions found");
                return Result<int>.Success(0);
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

                // Note: EF Core will handle cascading delete for UserAnswers if configured.
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