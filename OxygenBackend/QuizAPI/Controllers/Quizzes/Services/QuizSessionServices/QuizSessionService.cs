using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using AutoMapper.QueryableExtensions;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class QuizSessionService : IQuizSessionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<QuizSessionService> _logger;
        private readonly IMapper _mapper;
        private readonly ISessionAbandonmentService _abandonmentService;
        private readonly IAnswerGradingService _gradingService;
        private readonly QuizSessionOptions _options;

        public QuizSessionService(
            ApplicationDbContext context,
            ILogger<QuizSessionService> logger,
            IMapper mapper,
            ISessionAbandonmentService abandonmentService,
            IAnswerGradingService gradingService,
            IOptions<QuizSessionOptions> options)
        {
            _context = context;
            _logger = logger;
            _mapper = mapper;
            _abandonmentService = abandonmentService;
            _gradingService = gradingService;
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
                        .SetProperty(x => x.CurrentQuestionStartTime, (DateTime?)null)
                        .SetProperty(x => x.AbandonmentReason, AbandonmentReason.Timeout) // NEW
                        .SetProperty(x => x.AbandonedAt, DateTime.UtcNow));

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

        // Re-name to StartNextQuestionAsync, or AdvanceToNextQuestionAsync, since the name GetNextQuestionAsync is misleading
        // Using transaction = not wrong in this method, but a bit redundant.
        public async Task<Result<CurrentQuestionDto>> GetNextQuestionAsync(Guid sessionId)
        {
            if (sessionId == Guid.Empty)
                return Result<CurrentQuestionDto>.ValidationFailure("Invalid session ID.");
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

                var answeredQuestionIds = session.UserAnswers.Select(ua => ua.QuizQuestionId).ToHashSet();
                var nextQuizQuestion = session.Quiz.QuizQuestions
                    .Where(qq => !answeredQuestionIds.Contains(qq.Id))
                    .OrderBy(qq => qq.OrderInQuiz)
                    .FirstOrDefault();

                if (nextQuizQuestion == null)
                {
                    return Result<CurrentQuestionDto>.ValidationFailure("No more questions available.");
                }

                // Atomic update with race condition protection
                var updatedRows = await _context.QuizSessions
                    .Where(s => s.Id == sessionId && s.CurrentQuizQuestionId == null && !s.IsCompleted)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(x => x.CurrentQuizQuestionId, nextQuizQuestion.Id)
                        .SetProperty(x => x.CurrentQuestionStartTime, DateTime.UtcNow));

                if (updatedRows == 0)
                {
                    return Result<CurrentQuestionDto>.ValidationFailure("An answer for the current question is still pending.");
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
                _logger.LogInformation("SubmitAnswerAsync called with model: {@Model}", model);

                using var transaction = await _context.Database.BeginTransactionAsync();

                var session = await _context.QuizSessions
                    .Include(s => s.Quiz)
                    .Include(s => s.CurrentQuizQuestion)
                        .ThenInclude(qq => qq!.Question)
                    .FirstOrDefaultAsync(s => s.Id == model.SessionId);

                if (session == null)
                {
                    _logger.LogWarning("Session {SessionId} not found.", model.SessionId);
                    return Result<AnswerResultDto>.ValidationFailure("Session not found.");
                }
                if (session.IsCompleted)
                {
                    _logger.LogWarning("Session {SessionId} is already completed.", session.Id);
                    return Result<AnswerResultDto>.ValidationFailure("This quiz session is already completed.");
                }
                if (session.CurrentQuizQuestionId == null || session.CurrentQuestionStartTime == null)
                {
                    _logger.LogWarning("Session {SessionId} not expecting an answer right now.", session.Id);
                    return Result<AnswerResultDto>.ValidationFailure("Not currently expecting an answer. Please request the next question.");
                }
                if (session.CurrentQuizQuestionId != model.QuizQuestionId)
                {
                    _logger.LogWarning("Session {SessionId} got mismatched question Id. Expected {Expected}, got {Actual}",
                        session.Id, session.CurrentQuizQuestionId, model.QuizQuestionId);
                    return Result<AnswerResultDto>.ValidationFailure("Submitted answer is for the wrong question.");
                }

                var questionStartTime = session.CurrentQuestionStartTime.Value;
                var timeLimit = session.CurrentQuizQuestion!.TimeLimitInSeconds + _options.GracePeriodSeconds;
                var timeTaken = DateTime.UtcNow - questionStartTime;
                bool isTimedOut = timeTaken.TotalSeconds > timeLimit;

                _logger.LogInformation("Session {SessionId}: TimeTaken={TimeTakenSeconds}s, Limit={TimeLimitSeconds}s, TimedOut={TimedOut}",
                    session.Id, timeTaken.TotalSeconds, timeLimit, isTimedOut);

                // Create the user answer record
                var userAnswer = _mapper.Map<UserAnswer>(model);
                userAnswer.SubmittedTime = DateTime.UtcNow;
                userAnswer.QuestionStartTime = questionStartTime;

                _logger.LogInformation("Mapped UserAnswer before processing: {@UserAnswer}", userAnswer);

                // Handle True/False questions
                if (session.CurrentQuizQuestion.Question is TrueFalseQuestion)
                {
                    var originalSelectedOptionId = userAnswer.SelectedOptionId;
                    userAnswer.SelectedOptionId = null;
                    userAnswer.SubmittedAnswer = originalSelectedOptionId == 1 ? "True" : "False";

                    _logger.LogInformation("True/False handling: OriginalOptionId={Original}, ConvertedAnswer={Converted}",
                        originalSelectedOptionId, userAnswer.SubmittedAnswer);
                }

                // Initialize answer based on whether we have instant feedback
                bool hasInstantFeedback = session.Quiz.ShowFeedbackImmediately;
                _logger.LogInformation("Session {SessionId}: HasInstantFeedback={HasInstantFeedback}", session.Id, hasInstantFeedback);

                if (isTimedOut)
                {
                    userAnswer.Status = AnswerStatus.TimedOut;
                    userAnswer.Score = 0;
                }
                else if (hasInstantFeedback)
                {
                    var gradingResult = await _gradingService.GradeAnswerAsync(
                        session.CurrentQuizQuestionId.Value,
                        userAnswer,
                        session.CurrentQuestionStartTime.Value);

                    userAnswer.Status = gradingResult.Status;
                    userAnswer.Score = gradingResult.Score;
                    session.TotalScore += userAnswer.Score;

                    _logger.LogInformation("Grading result: Status={Status}, Score={Score}", gradingResult.Status, gradingResult.Score);
                }
                else
                {
                    userAnswer.Status = AnswerStatus.Pending;
                    userAnswer.Score = 0;

                    _logger.LogInformation("Answer set to Pending for background grading.");
                }

                // Clear current question tracking
                session.CurrentQuizQuestionId = null;
                session.CurrentQuestionStartTime = null;

                // Add answer to database
                _context.UserAnswers.Add(userAnswer);
                await _context.SaveChangesAsync();

                _logger.LogInformation("UserAnswer saved with Id={UserAnswerId}, Status={Status}, Score={Score}",
                    userAnswer.Id, userAnswer.Status, userAnswer.Score);

                // Check if quiz is complete
                var totalQuestionsInQuiz = await _context.QuizQuestions.CountAsync(qq => qq.QuizId == session.QuizId);
                var answeredQuestions = await _context.UserAnswers.CountAsync(ua => ua.SessionId == session.Id);
                bool isQuizComplete = totalQuestionsInQuiz == answeredQuestions;

                _logger.LogInformation("Quiz progress: {Answered}/{Total} answered. Complete={Complete}",
                    answeredQuestions, totalQuestionsInQuiz, isQuizComplete);

                if (isQuizComplete)
                {
                    session.IsCompleted = true;
                    session.EndTime = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Session {SessionId} marked complete at {EndTime}", session.Id, session.EndTime);
                }

                //  COMMIT TRANSACTION FIRST - Ensure all data is persisted
                await transaction.CommitAsync();
                _logger.LogInformation("Transaction committed for UserAnswer {UserAnswerId}", userAnswer.Id);

                //  THEN ENQUEUE BACKGROUND GRADING - After data is guaranteed to be visible
                if (!hasInstantFeedback && !isTimedOut)
                {
                    _gradingService.EnqueueAnswerGrading(userAnswer.Id, questionStartTime);
                    _logger.LogInformation("Enqueued answer grading for UserAnswerId={UserAnswerId}", userAnswer.Id);
                }

                var resultDto = new AnswerResultDto
                {
                    Status = hasInstantFeedback ? userAnswer.Status : AnswerStatus.Pending,
                    ScoreAwarded = hasInstantFeedback ? userAnswer.Score : 0,
                    IsQuizComplete = isQuizComplete
                };

                _logger.LogInformation("Returning result: {@ResultDto}", resultDto);

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
                using var transaction = await _context.Database.BeginTransactionAsync();

                var quiz = await _context.Quizzes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(q => q.Id == model.QuizId && q.IsActive && q.IsPublished);

                if (quiz == null)
                    return Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available.");

                // Use the existing method (now with fixed logic)
                var existingActiveSession = await _abandonmentService.GetActiveSessionForUserAsync(model.UserId, model.QuizId);

                if (existingActiveSession != null)
                {
                    await transaction.CommitAsync();

                    var timeSinceLastActivity = existingActiveSession.CurrentQuestionStartTime.HasValue
                        ? DateTime.UtcNow - existingActiveSession.CurrentQuestionStartTime.Value
                        : DateTime.UtcNow - existingActiveSession.StartTime;

                    var existingSessionDto = await GetSessionDtoAsync(existingActiveSession.Id);

                    return Result<QuizSessionDto>.ValidationFailure(
                        $"You have an active session for this quiz (started {timeSinceLastActivity.TotalMinutes:F1} minutes ago). " +
                        "Please either continue your existing session or abandon it to start fresh.",
                        existingSessionDto);
                }

                // No existing session, create new one
                var session = _mapper.Map<QuizSession>(model);
                session.Id = Guid.NewGuid();
                session.StartTime = DateTime.UtcNow;
                session.TotalScore = 0;
                session.IsCompleted = false;
                session.CurrentQuizQuestionId = null;
                session.CurrentQuestionStartTime = null;

                _context.QuizSessions.Add(session);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var sessionDto = await GetSessionDtoAsync(session.Id);
                return Result<QuizSessionDto>.Success(sessionDto!);
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("IX_QuizSessions_ActiveUserQuiz") == true)
            {
                return Result<QuizSessionDto>.ValidationFailure("A session for this quiz is already in progress.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating quiz session for user {UserId} and quiz {QuizId}", model.UserId, model.QuizId);
                return Result<QuizSessionDto>.Failure("Failed to create quiz session.");
            }
        }



        public async Task<Result<QuizSessionDto>> AbandonAndCreateNewSessionAsync(Guid existingSessionId, QuizSessionCM model)
        {
            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                // First, abandon the existing session
                var existingSession = await _context.QuizSessions
                    .FirstOrDefaultAsync(s => s.Id == existingSessionId && s.UserId == model.UserId);

                if (existingSession == null)
                    return Result<QuizSessionDto>.ValidationFailure("Existing session not found or doesn't belong to you.");

                if (existingSession.IsCompleted)
                    return Result<QuizSessionDto>.ValidationFailure("Existing session is already completed.");

                // Mark existing session as abandoned with proper tracking
                existingSession.IsCompleted = true;
                existingSession.EndTime = DateTime.UtcNow;
                existingSession.CurrentQuizQuestionId = null;
                existingSession.CurrentQuestionStartTime = null;
                existingSession.AbandonmentReason = AbandonmentReason.UserInitiated; // NEW
                existingSession.AbandonedAt = DateTime.UtcNow; // NEW

                // Create new session
                var quiz = await _context.Quizzes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(q => q.Id == model.QuizId && q.IsActive && q.IsPublished);

                if (quiz == null)
                    return Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available.");

                var newSession = _mapper.Map<QuizSession>(model);
                newSession.Id = Guid.NewGuid();
                newSession.StartTime = DateTime.UtcNow;
                newSession.TotalScore = 0;
                newSession.IsCompleted = false;
                newSession.CurrentQuizQuestionId = null;
                newSession.CurrentQuestionStartTime = null;
                newSession.AbandonmentReason = null; // NEW - ensure new session is clean
                newSession.AbandonedAt = null; // NEW

                _context.QuizSessions.Add(newSession);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var sessionDto = await GetSessionDtoAsync(newSession.Id);
                return Result<QuizSessionDto>.Success(sessionDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error abandoning session {ExistingSessionId} and creating new session for user {UserId}",
                    existingSessionId, model.UserId);
                return Result<QuizSessionDto>.Failure("Failed to abandon existing session and create new one.");
            }
        }

        public async Task<Result<QuizSessionDto>> ResumeSessionAsync(Guid sessionId, Guid userId)
        {
            try
            {
                var session = await _context.QuizSessions
                    .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId && !s.IsCompleted);

                if (session == null)
                    return Result<QuizSessionDto>.ValidationFailure("Session not found or already completed.");

                // Check if session was abandoned due to inactivity
                if (await _abandonmentService.IsSessionAbandonedAsync(session))
                {
                    return Result<QuizSessionDto>.ValidationFailure("This session has been abandoned due to inactivity.");
                }

                var sessionDto = await GetSessionDtoAsync(sessionId);
                return Result<QuizSessionDto>.Success(sessionDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resuming session {SessionId} for user {UserId}", sessionId, userId);
                return Result<QuizSessionDto>.Failure("Failed to resume session.");
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

        #region Grading Service Methods

        public async Task<Result<SessionGradingStatus>> GetGradingStatusAsync(Guid sessionId)
        {
            try
            {
                var session = await _context.QuizSessions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == sessionId);

                if (session == null)
                    return Result<SessionGradingStatus>.ValidationFailure("Session not found.");

                var status = await _gradingService.GetSessionGradingStatusAsync(sessionId);
                return Result<SessionGradingStatus>.Success(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting grading status for session {SessionId}", sessionId);
                return Result<SessionGradingStatus>.Failure("Failed to get grading status.");
            }
        }

        public async Task<Result<QuizSessionDto>> GetSessionWithGradedAnswersAsync(Guid sessionId, int maxWaitSeconds = 30)
        {
            try
            {
                var session = await _context.QuizSessions
                    .Include(s => s.Quiz)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == sessionId);

                if (session == null)
                    return Result<QuizSessionDto>.ValidationFailure("Session not found.");

                // If instant feedback, return immediately
                if (session.Quiz.ShowFeedbackImmediately)
                {
                    var sessionDto = await GetSessionDtoAsync(sessionId);
                    return Result<QuizSessionDto>.Success(sessionDto!);
                }

                // For non-instant feedback, wait for grading to complete
                var startTime = DateTime.UtcNow;
                var timeout = TimeSpan.FromSeconds(maxWaitSeconds);

                while (DateTime.UtcNow - startTime < timeout)
                {
                    var areAllGraded = await _gradingService.AreAllAnswersGradedAsync(sessionId);

                    if (areAllGraded)
                    {
                        // Refresh session to get updated scores
                        var completedSessionDto = await GetSessionDtoAsync(sessionId);
                        return Result<QuizSessionDto>.Success(completedSessionDto!);
                    }

                    // Wait a bit before checking again
                    await Task.Delay(500);
                }

                // Timeout reached - return session with current state
                _logger.LogWarning("Timeout waiting for grading to complete for session {SessionId}", sessionId);
                var currentSessionDto = await GetSessionDtoAsync(sessionId);

                // You might want to add a flag to indicate grading is still in progress
                return Result<QuizSessionDto>.Success(currentSessionDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting session with graded answers for {SessionId}", sessionId);
                return Result<QuizSessionDto>.Failure("Failed to retrieve session results.");
            }
        }

        #endregion

        #region Private Helper Methods

        //DEPRICATED SINCE NEW ANSWER GRADING SERVICE

        /*private async Task<(bool IsCorrect, int Score)> GradeAnswerAsync(QuestionBase question, UserAnswer answer, DateTime questionStartTime)
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
        }*/


        private async Task<QuizSessionDto?> GetSessionDtoAsync(Guid sessionId)
        {
            // No more manual .Include() statements.
            // ProjectTo reads your mapping profile and generates the single, optimal SQL query
            // with all the necessary JOINs to get the data, including AnswerOptions.
            var sessionDto = await _context.QuizSessions
                .Where(s => s.Id == sessionId)
                .AsNoTracking()
                .ProjectTo<QuizSessionDto>(_mapper.ConfigurationProvider) // The magic is here
                .FirstOrDefaultAsync();

            return sessionDto;
        }

        #endregion
    }
}