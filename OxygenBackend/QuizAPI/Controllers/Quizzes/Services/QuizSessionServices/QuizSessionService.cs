using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    public class QuizSessionService : IQuizSessionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<QuizSessionService> _logger;
        private readonly ISessionAbandonmentService _abandonmentService;
        private readonly IAnswerGradingService _gradingService;
        private readonly ISubmitAnswerService _submitAnswerService;

        public QuizSessionService(
            ApplicationDbContext context,
            ILogger<QuizSessionService> logger,
            ISessionAbandonmentService abandonmentService,
            IAnswerGradingService gradingService,
            ISubmitAnswerService submitAnswerService
            )
        {
            _context = context;
            _logger = logger;
            _abandonmentService = abandonmentService;
            _gradingService = gradingService;
            _submitAnswerService = submitAnswerService;
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
                    // Mark as abandoned and return completed state.
                    // App-clock timestamp (see GetNextQuestionAsync) so EndTime/AbandonedAt stay
                    // consistent with the app-clock StartTime when durations are computed.
                    var abandonedAt = DateTime.UtcNow;
                    await _context.QuizSessions
                    .Where(s => s.Id == sessionId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(x => x.IsCompleted, true)
                        .SetProperty(x => x.EndTime, abandonedAt)
                        .SetProperty(x => x.CurrentQuizQuestionId, (int?)null)
                        .SetProperty(x => x.CurrentQuestionStartTime, (DateTime?)null)
                        .SetProperty(x => x.AbandonmentReason, AbandonmentReason.Timeout) // NEW
                        .SetProperty(x => x.AbandonedAt, abandonedAt));

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
                    var activeQuestionDto = session.CurrentQuizQuestion?.ToCurrentQuestionDto();

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
                // Only rows visible to the session's pinned quiz version: an edit made after this
                // session started must not add, remove or reconfigure the player's questions.
                var nextQuizQuestion = session.Quiz.QuizQuestions
                    .Where(qq => qq.IsVisibleToVersion(session.QuizVersion))
                    .Where(qq => !answeredQuestionIds.Contains(qq.Id))
                    .OrderBy(qq => qq.OrderInQuiz)
                    .FirstOrDefault();

                if (nextQuizQuestion == null)
                {
                    return Result<CurrentQuestionDto>.ValidationFailure("No more questions available.");
                }

                // Atomic update with race condition protection.
                // Capture the start time in C# first: a bare `DateTime.UtcNow` inside ExecuteUpdate
                // is translated to the DATABASE clock (SQL now()), whereas SubmittedTime is stamped
                // with the APP clock. Any drift between the two (e.g. a containerised DB whose clock
                // runs ahead) then makes a fast answer record a NEGATIVE elapsed time. Using one
                // captured app-clock value keeps both timestamps on the same clock.
                var questionStartedAt = DateTime.UtcNow;
                var updatedRows = await _context.QuizSessions
                    .Where(s => s.Id == sessionId && s.CurrentQuizQuestionId == null && !s.IsCompleted)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(x => x.CurrentQuizQuestionId, nextQuizQuestion.Id)
                        .SetProperty(x => x.CurrentQuestionStartTime, questionStartedAt));

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

                var questionDto = fullQuestionForMapping.ToCurrentQuestionDto();
                questionDto.TimeRemainingInSeconds = questionDto.TimeLimitInSeconds;

                return Result<CurrentQuestionDto>.Success(questionDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting next question for session {SessionId}", sessionId);
                return Result<CurrentQuestionDto>.Failure("An error occurred while fetching the next question.");
            }
        }

        public async Task<Result<InstantFeedbackAnswerResultDto>> SubmitAnswerAsync(UserAnswerCM model)
        {
            // Delegated to the dedicated SubmitAnswerService — the single source of truth for the
            // submit / grade / persist flow. An inline copy used to live (and actually run) here in
            // parallel with the service; the two were reconciled (True/False normalisation on every
            // path, the client IsTimedOut flag honoured, multi-select correct-option ids surfaced)
            // and the inline version removed so there is only one implementation to maintain.
            return await _submitAnswerService.SubmitAnswerAsync(model);
        }


        #endregion

        #region Session Management

        /// <summary>
        /// Whether <paramref name="userId"/> may start a session for <paramref name="quiz"/>:
        /// Public quizzes are open to all; the owner may always play (including their own Drafts);
        /// an Unlisted quiz additionally requires the matching share token. See docs/quiz/quiz-visibility.md.
        /// </summary>
        private static bool IsPlayAuthorized(Quiz quiz, Guid userId, string? shareToken) =>
            quiz.Status == QuizStatus.Public
            || quiz.UserId == userId
            || (quiz.Status == QuizStatus.Unlisted
                && !string.IsNullOrEmpty(quiz.ShareToken)
                && string.Equals(quiz.ShareToken, shareToken, StringComparison.Ordinal));

        public async Task<Result<QuizSessionDto>> CreateSessionAsync(QuizSessionCM model)
        {
            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                // Bypass the discovery filter so Unlisted quizzes can be authorized explicitly below;
                // soft-deleted quizzes are still excluded. Same failure message whether the quiz is
                // missing or simply not accessible, so ids/tokens can't be probed for existence.
                var quiz = await _context.Quizzes
                    .AsNoTracking()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(q => q.Id == model.QuizId && q.DeletedAt == null);

                if (quiz == null || !IsPlayAuthorized(quiz, model.UserId, model.ShareToken))
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
                var session = model.ToEntity();
                session.Id = Guid.NewGuid();
                // Pin the session to the quiz version it starts on (docs/quiz/quiz-editing.md): the
                // session is only ever served QuizQuestion rows visible to this version, so a
                // concurrent edit by the owner can't change the game mid-flight.
                session.QuizVersion = quiz.Version;
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



        /// <summary>
        /// Creates a session for the shared guest account (see docs/auth/guest-play.md). Deliberately
        /// skips the "you already have an active session" check that real accounts get — every
        /// guest shares the same UserId, so that check would (wrongly) treat one guest's in-progress
        /// quiz as blocking a completely different guest from starting one.
        /// </summary>
        public async Task<Result<QuizSessionDto>> CreateGuestSessionAsync(int quizId)
        {
            try
            {
                // Guests can only play fully public quizzes — there's no account or token to
                // authorize Unlisted/Draft access.
                var quiz = await _context.Quizzes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(q => q.Id == quizId && q.Status == QuizStatus.Public);

                if (quiz == null)
                    return Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available.");

                var session = new QuizSession
                {
                    Id = Guid.NewGuid(),
                    QuizId = quizId,
                    UserId = QuizAPI.Services.GuestAccount.Id,
                    StartTime = DateTime.UtcNow,
                    TotalScore = 0,
                    IsCompleted = false,
                    IsGuestSession = true,
                    // Same version pinning as regular sessions (docs/quiz/quiz-editing.md).
                    QuizVersion = quiz.Version,
                };

                _context.QuizSessions.Add(session);
                await _context.SaveChangesAsync();

                var sessionDto = await GetSessionDtoAsync(session.Id);
                return Result<QuizSessionDto>.Success(sessionDto!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating guest quiz session for quiz {QuizId}", quizId);
                return Result<QuizSessionDto>.Failure("Failed to create quiz session.");
            }
        }

        public async Task<bool> IsGuestSessionAsync(Guid sessionId)
        {
            return await _context.QuizSessions
                .AsNoTracking()
                .Where(s => s.Id == sessionId)
                .Select(s => s.IsGuestSession)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// Permanently deletes a guest session and its answers right after the guest has viewed
        /// their results — nothing about a guest attempt is meant to outlive that page view.
        /// Refuses to touch a session that isn't flagged as a guest session.
        /// </summary>
        public async Task<Result> DiscardGuestSessionAsync(Guid sessionId)
        {
            try
            {
                var session = await _context.QuizSessions
                    .FirstOrDefaultAsync(s => s.Id == sessionId && s.IsGuestSession);

                if (session == null)
                    return Result.ValidationFailure("Guest session not found.");

                var answers = _context.UserAnswers.Where(a => a.SessionId == sessionId);
                _context.UserAnswers.RemoveRange(answers);
                _context.QuizSessions.Remove(session);
                await _context.SaveChangesAsync();

                return Result.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error discarding guest session {SessionId}", sessionId);
                return Result.Failure("Failed to discard guest session.");
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

                // Create new session (re-authorize the same way CreateSessionAsync does).
                var quiz = await _context.Quizzes
                    .AsNoTracking()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(q => q.Id == model.QuizId && q.DeletedAt == null);

                if (quiz == null || !IsPlayAuthorized(quiz, model.UserId, model.ShareToken))
                    return Result<QuizSessionDto>.ValidationFailure("Quiz not found or not available.");

                var newSession = model.ToEntity();
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

        /// <summary>
        /// Resolves a session's state by auto-timing-out any expired questions,
        /// then returns the correct question for the user to resume on.
        /// This is the "mathematical catch-up" — no background timers needed.
        /// </summary>
        public async Task<Result<ResumeResultDto>> ResolveAndResumeAsync(Guid sessionId, Guid userId)
        {
            try
            {
                var session = await _context.QuizSessions
                    .Include(s => s.Quiz)
                        .ThenInclude(q => q.QuizQuestions)
                            .ThenInclude(qq => qq.Question)
                    .Include(s => s.UserAnswers)
                    .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId && !s.IsCompleted);

                if (session == null)
                    return Result<ResumeResultDto>.ValidationFailure("Session not found or already completed.");

                if (await _abandonmentService.IsSessionAbandonedAsync(session))
                {
                    await MarkSessionAbandoned(session, AbandonmentReason.Timeout);
                    return Result<ResumeResultDto>.Success(BuildCompletedResult(session, sessionId));
                }

                var answeredIds = session.UserAnswers.Select(ua => ua.QuizQuestionId).ToHashSet();
                // Pinned-version view of the quiz — see GetNextQuestionAsync / docs/quiz/quiz-editing.md.
                var unansweredQuestions = session.Quiz.QuizQuestions
                    .Where(qq => qq.IsVisibleToVersion(session.QuizVersion))
                    .Where(qq => !answeredIds.Contains(qq.Id))
                    .OrderBy(qq => qq.OrderInQuiz)
                    .ToList();

                // If no unanswered questions remain, the quiz is already done
                if (!unansweredQuestions.Any())
                {
                    await CompleteSession(session);
                    return Result<ResumeResultDto>.Success(BuildCompletedResult(session, sessionId));
                }

                var skippedCount = 0;

                // --- Step 1: Handle the currently active question (if any) ---
                double overflowSeconds = 0;

                if (session.CurrentQuizQuestionId != null && session.CurrentQuestionStartTime.HasValue)
                {
                    var currentQuestion = unansweredQuestions
                        .FirstOrDefault(qq => qq.Id == session.CurrentQuizQuestionId);

                    if (currentQuestion != null)
                    {
                        var elapsed = (DateTime.UtcNow - session.CurrentQuestionStartTime.Value).TotalSeconds;
                        var timeLimit = currentQuestion.TimeLimitInSeconds;

                        if (elapsed <= timeLimit)
                        {
                            // User came back in time — resume this question
                            return await BuildResumeOnCurrentQuestion(
                                session, sessionId, currentQuestion, answeredIds.Count, elapsed);
                        }

                        // Time expired — auto-mark as timed out
                        CreateTimedOutAnswer(session, currentQuestion);
                        skippedCount++;
                        overflowSeconds = elapsed - timeLimit;

                        // Remove from unanswered list since we just handled it
                        unansweredQuestions = unansweredQuestions
                            .Where(qq => qq.Id != currentQuestion.Id)
                            .ToList();
                    }

                    // Clear the active question tracking
                    session.CurrentQuizQuestionId = null;
                    session.CurrentQuestionStartTime = null;
                }

                // --- Step 2: Walk through remaining questions, timing out any that would have expired ---
                foreach (var question in unansweredQuestions.ToList())
                {
                    if (overflowSeconds >= question.TimeLimitInSeconds)
                    {
                        // This question's entire time window has passed
                        CreateTimedOutAnswer(session, question);
                        skippedCount++;
                        overflowSeconds -= question.TimeLimitInSeconds;
                        unansweredQuestions.Remove(question);
                    }
                    else
                    {
                        // This is the question the user should resume on
                        var timeRemaining = question.TimeLimitInSeconds - (int)overflowSeconds;

                        await _context.SaveChangesAsync();

                        return await BuildResumeOnNewQuestion(
                            session, sessionId, question, answeredIds.Count + skippedCount, timeRemaining, skippedCount);
                    }
                }

                // --- Step 3: All questions timed out — complete the quiz ---
                await _context.SaveChangesAsync();
                await CompleteSession(session);

                var completedSessionDto = await GetSessionDtoAsync(sessionId);
                return Result<ResumeResultDto>.Success(new ResumeResultDto
                {
                    Session = completedSessionDto!,
                    IsQuizComplete = true,
                    SkippedCount = skippedCount,
                    QuestionNumber = answeredIds.Count + skippedCount,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving and resuming session {SessionId} for user {UserId}",
                    sessionId, userId);
                return Result<ResumeResultDto>.Failure("Failed to resume session.");
            }
        }

        #region Resume Helpers

        /// <summary>
        /// Creates a UserAnswer record with TimedOut status for a question that expired while the user was away.
        /// </summary>
        private void CreateTimedOutAnswer(QuizSession session, QuizQuestion question)
        {
            var timedOutAnswer = new UserAnswer
            {
                SessionId = session.Id,
                QuizQuestionId = question.Id,
                Status = AnswerStatus.TimedOut,
                Score = 0,
                QuestionStartTime = session.CurrentQuestionStartTime ?? DateTime.UtcNow,
                SubmittedTime = null,
                SelectedOptionId = null,
                SubmittedAnswer = null,
            };

            _context.UserAnswers.Add(timedOutAnswer);

            _logger.LogInformation(
                "Auto-timed-out question {QuestionId} for session {SessionId}",
                question.Id, session.Id);
        }

        /// <summary>
        /// User came back while the current question is still active — resume it with reduced time.
        /// </summary>
        private async Task<Result<ResumeResultDto>> BuildResumeOnCurrentQuestion(
            QuizSession session, Guid sessionId, QuizQuestion question, int answeredCount, double elapsed)
        {
            await LoadQuestionDetails(question);
            var questionDto = question.ToCurrentQuestionDto();
            questionDto.TimeRemainingInSeconds = Math.Max(0, question.TimeLimitInSeconds - (int)elapsed);

            var sessionDto = await GetSessionDtoAsync(sessionId);
            return Result<ResumeResultDto>.Success(new ResumeResultDto
            {
                Session = sessionDto!,
                ActiveQuestion = questionDto,
                QuestionNumber = answeredCount + 1,
                IsQuizComplete = false,
                SkippedCount = 0,
            });
        }

        /// <summary>
        /// The current question timed out and we've landed on a new one — set it as active with adjusted time.
        /// </summary>
        private async Task<Result<ResumeResultDto>> BuildResumeOnNewQuestion(
            QuizSession session, Guid sessionId, QuizQuestion question, int answeredCount, int timeRemaining, int skippedCount)
        {
            // Set this question as the current active question
            session.CurrentQuizQuestionId = question.Id;
            session.CurrentQuestionStartTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await LoadQuestionDetails(question);
            var questionDto = question.ToCurrentQuestionDto();
            questionDto.TimeRemainingInSeconds = timeRemaining;

            var sessionDto = await GetSessionDtoAsync(sessionId);
            return Result<ResumeResultDto>.Success(new ResumeResultDto
            {
                Session = sessionDto!,
                ActiveQuestion = questionDto,
                QuestionNumber = answeredCount + 1,
                IsQuizComplete = false,
                SkippedCount = skippedCount,
            });
        }

        /// <summary>
        /// Loads answer options for multiple-choice questions (needed for mapping to DTOs).
        /// </summary>
        private async Task LoadQuestionDetails(QuizQuestion quizQuestion)
        {
            if (quizQuestion.Question is MultipleChoiceQuestion)
            {
                await _context.Entry(quizQuestion.Question)
                    .Collection(q => ((MultipleChoiceQuestion)q).AnswerOptions)
                    .LoadAsync();
            }
        }

        private async Task CompleteSession(QuizSession session)
        {
            session.IsCompleted = true;
            session.EndTime = DateTime.UtcNow;
            session.CurrentQuizQuestionId = null;
            session.CurrentQuestionStartTime = null;
            await _context.SaveChangesAsync();
        }

        private async Task MarkSessionAbandoned(QuizSession session, AbandonmentReason reason)
        {
            session.IsCompleted = true;
            session.EndTime = DateTime.UtcNow;
            session.CurrentQuizQuestionId = null;
            session.CurrentQuestionStartTime = null;
            session.AbandonmentReason = reason;
            session.AbandonedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private ResumeResultDto BuildCompletedResult(QuizSession session, Guid sessionId)
        {
            return new ResumeResultDto
            {
                Session = session.ToDto(),
                IsQuizComplete = true,
                SkippedCount = 0,
                QuestionNumber = session.UserAnswers?.Count ?? 0,
            };
        }

        #endregion

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

        public async Task<Guid?> GetSessionOwnerAsync(Guid sessionId)
        {
            // Returns null when the session doesn't exist; the caller treats "not found" and
            // "not yours" identically (404) so a real user's session id can't be probed.
            return await _context.QuizSessions
                .AsNoTracking()
                .Where(s => s.Id == sessionId)
                .Select(s => (Guid?)s.UserId)
                .FirstOrDefaultAsync();
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

                var sessionDtos = sessions.ToSummaryDtoList();
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

        private async Task<QuizSessionDto?> GetSessionDtoAsync(Guid sessionId)
        {
            // with all the necessary JOINs to get the data, including AnswerOptions.
            var sessionDto = await _context.QuizSessions
                .Where(s => s.Id == sessionId)
                .AsNoTracking()
                .Select(QuizSessionMappers.ProjectSession) 
                .FirstOrDefaultAsync();

            return sessionDto;
        }

        #endregion
    }
}