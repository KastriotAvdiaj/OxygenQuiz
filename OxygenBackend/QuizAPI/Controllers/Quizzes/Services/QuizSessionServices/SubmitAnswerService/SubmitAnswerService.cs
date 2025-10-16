using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.Common;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService
{
    public class SubmitAnswerService : ISubmitAnswerService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAnswerGradingService _gradingService;
        private readonly IMapper _mapper;
        private readonly ILogger<SubmitAnswerService> _logger;
        private readonly QuizSessionOptions _options;

        public SubmitAnswerService(
            ApplicationDbContext context,
            IAnswerGradingService gradingService,
            IMapper mapper,
            ILogger<SubmitAnswerService> logger,
            IOptions<QuizSessionOptions> options)
        {
            _context = context;
            _gradingService = gradingService;
            _mapper = mapper;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<Result<InstantFeedbackAnswerResultDto>> SubmitAnswerAsync(UserAnswerCM model)
        {
            try
            {
                _logger.LogInformation("SubmitAnswerAsync called with model: {@Model}", model);

                using var transaction = await _context.Database.BeginTransactionAsync();

                var session = await LoadSessionWithDetailsAsync(model.SessionId);
                var validationResult = ValidateSession(session, model);
                if (!validationResult.IsSuccess)
                    return Result<InstantFeedbackAnswerResultDto>.ValidationFailure(validationResult.ValidationErrors);

                var timeContext = CalculateTimeContext(session!);
                var userAnswer = CreateUserAnswer(model, session, timeContext);

                await ProcessAnswerAsync(userAnswer, session, timeContext);

                ClearCurrentQuestion(session);
                _context.UserAnswers.Add(userAnswer);
                await _context.SaveChangesAsync();

                var isQuizComplete = await CheckAndCompleteQuizAsync(session);

                await transaction.CommitAsync();
                _logger.LogInformation("Transaction committed for UserAnswer {UserAnswerId}", userAnswer.Id);

                // Enqueue background grading after commit to ensure data is persisted
                TryEnqueueBackgroundGrading(userAnswer, session.Quiz.ShowFeedbackImmediately, timeContext);

                var resultDto = BuildResultDto(userAnswer, session, timeContext, isQuizComplete);

                _logger.LogInformation("Returning result: {@ResultDto}", resultDto);
                return Result<InstantFeedbackAnswerResultDto>.Success(resultDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting answer for session {SessionId}", model.SessionId);
                return Result<InstantFeedbackAnswerResultDto>.Failure("An error occurred while submitting the answer.");
            }
        }

        private async Task<QuizSession?> LoadSessionWithDetailsAsync(Guid sessionId)
        {
            return await _context.QuizSessions
                .Include(s => s.Quiz)
                .Include(s => s.CurrentQuizQuestion)
                    .ThenInclude(qq => qq!.Question)
                .FirstOrDefaultAsync(s => s.Id == sessionId);
        }

        private Result ValidateSession(QuizSession? session, UserAnswerCM model)
        {
            if (session == null)
            {
                _logger.LogWarning("Session {SessionId} not found.", model.SessionId);
                return Result.ValidationFailure("Session not found.");
            }
            if (session.IsCompleted)
            {
                _logger.LogWarning("Session {SessionId} is already completed.", session.Id);
                return Result.ValidationFailure("This quiz session is already completed.");
            }
            if (session.CurrentQuizQuestionId == null || session.CurrentQuestionStartTime == null)
            {
                _logger.LogWarning("Session {SessionId} not expecting an answer right now.", session.Id);
                return Result.ValidationFailure("Not currently expecting an answer. Please request the next question.");
            }
            if (session.CurrentQuizQuestionId != model.QuizQuestionId)
            {
                _logger.LogWarning("Session {SessionId} got mismatched question Id. Expected {Expected}, got {Actual}",
                    session.Id, session.CurrentQuizQuestionId, model.QuizQuestionId);
                return Result.ValidationFailure("Submitted answer is for the wrong question.");
            }
            return Result.Success();
        }

        private TimeContext CalculateTimeContext(QuizSession session)
        {
            var questionStartTime = session.CurrentQuestionStartTime!.Value;
            var timeLimit = session.CurrentQuizQuestion!.TimeLimitInSeconds + _options.GracePeriodSeconds;
            var timeTaken = DateTime.UtcNow - questionStartTime;
            var isTimedOut = timeTaken.TotalSeconds > timeLimit;

            _logger.LogInformation("Session {SessionId}: TimeTaken={TimeTakenSeconds}s, Limit={TimeLimitSeconds}s, TimedOut={TimedOut}",
                session.Id, timeTaken.TotalSeconds, timeLimit, isTimedOut);

            return new TimeContext(questionStartTime, timeTaken, isTimedOut);
        }

        private UserAnswer CreateUserAnswer(UserAnswerCM model, QuizSession session, TimeContext timeContext)
        {
            var userAnswer = _mapper.Map<UserAnswer>(model);
            userAnswer.SubmittedTime = DateTime.UtcNow;
            userAnswer.QuestionStartTime = timeContext.StartTime;

            _logger.LogInformation("Mapped UserAnswer before processing: {@UserAnswer}", userAnswer);
            return userAnswer;
        }

        private async Task ProcessAnswerAsync(UserAnswer userAnswer, QuizSession session, TimeContext timeContext)
        {
            if (timeContext.IsTimedOut)
            {
                MarkAsTimedOut(userAnswer);
                return;
            }

            if (session.Quiz.ShowFeedbackImmediately)
            {
                await GradeAnswerImmediatelyAsync(userAnswer, session);
            }
            else
            {
                MarkAsPending(userAnswer);
            }
        }

        private void MarkAsTimedOut(UserAnswer userAnswer)
        {
            userAnswer.Status = AnswerStatus.TimedOut;
            userAnswer.Score = 0;
            _logger.LogInformation("Answer marked as TimedOut");
        }

        private async Task GradeAnswerImmediatelyAsync(UserAnswer userAnswer, QuizSession session)
        {
            NormalizeTrueFalseAnswer(userAnswer, session.CurrentQuizQuestion!.Question);

            var gradingResult = await _gradingService.GradeAnswerAsync(
                session.CurrentQuizQuestionId!.Value,
                userAnswer,
                session.CurrentQuestionStartTime!.Value);

            userAnswer.Status = gradingResult.Status;
            userAnswer.Score = gradingResult.Score;
            session.TotalScore += userAnswer.Score;

            _logger.LogInformation("Grading result: Status={Status}, Score={Score}",
                gradingResult.Status, gradingResult.Score);
        }

        private void NormalizeTrueFalseAnswer(UserAnswer userAnswer, QuestionBase question)
        {
            if (question is not TrueFalseQuestion) return;

            var originalSelectedOptionId = userAnswer.SelectedOptionId;
            userAnswer.SelectedOptionId = null;
            userAnswer.SubmittedAnswer = originalSelectedOptionId == 1 ? "True" : "False";

            _logger.LogInformation("True/False handling: OriginalOptionId={Original}, ConvertedAnswer={Converted}",
                originalSelectedOptionId, userAnswer.SubmittedAnswer);
        }

        private void MarkAsPending(UserAnswer userAnswer)
        {
            userAnswer.Status = AnswerStatus.Pending;
            userAnswer.Score = 0;
            _logger.LogInformation("Answer set to Pending for background grading.");
        }

        private void ClearCurrentQuestion(QuizSession session)
        {
            session.CurrentQuizQuestionId = null;
            session.CurrentQuestionStartTime = null;
        }

        private async Task<bool> CheckAndCompleteQuizAsync(QuizSession session)
        {
            var totalQuestionsInQuiz = await _context.QuizQuestions.CountAsync(qq => qq.QuizId == session.QuizId);
            var answeredQuestions = await _context.UserAnswers.CountAsync(ua => ua.SessionId == session.Id);
            var isQuizComplete = totalQuestionsInQuiz == answeredQuestions;

            _logger.LogInformation("Quiz progress: {Answered}/{Total} answered. Complete={Complete}",
                answeredQuestions, totalQuestionsInQuiz, isQuizComplete);

            if (isQuizComplete)
            {
                session.IsCompleted = true;
                session.EndTime = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Session {SessionId} marked complete at {EndTime}", session.Id, session.EndTime);
            }

            return isQuizComplete;
        }

        private void TryEnqueueBackgroundGrading(UserAnswer userAnswer, bool hasInstantFeedback, TimeContext timeContext)
        {
            if (hasInstantFeedback || timeContext.IsTimedOut)
                return;

            try
            {
                _gradingService.EnqueueAnswerGrading(userAnswer.Id, timeContext.StartTime);
                _logger.LogInformation("Enqueued answer grading for UserAnswerId={UserAnswerId}", userAnswer.Id);
            }
            catch (Exception ex)
            {
                // Log but don't fail the entire operation since the answer is already committed
                _logger.LogError(ex, "Failed to enqueue background grading for UserAnswerId={UserAnswerId}. " +
                    "Answer was saved successfully but will need manual grading.", userAnswer.Id);
            }
        }

        private InstantFeedbackAnswerResultDto BuildResultDto(
            UserAnswer userAnswer,
            QuizSession session,
            TimeContext timeContext,
            bool isQuizComplete)
        {
            var hasInstantFeedback = session.Quiz.ShowFeedbackImmediately;
            var resultDto = new InstantFeedbackAnswerResultDto
            {
                Status = hasInstantFeedback ? userAnswer.Status : AnswerStatus.Pending,
                ScoreAwarded = hasInstantFeedback ? userAnswer.Score : 0,
                IsQuizComplete = isQuizComplete,
                TimeSpentInSeconds = timeContext.TimeTaken.TotalSeconds
            };

            if (hasInstantFeedback && ShouldShowCorrectAnswer(userAnswer.Status))
            {
                PopulateCorrectAnswerInfo(resultDto, session.CurrentQuizQuestion!.Question);
            }

            return resultDto;
        }

        private static bool ShouldShowCorrectAnswer(AnswerStatus status)
        {
            return status == AnswerStatus.Incorrect || status == AnswerStatus.TimedOut;
        }

        private void PopulateCorrectAnswerInfo(InstantFeedbackAnswerResultDto resultDto, QuestionBase question)
        {
            switch (question)
            {
                case MultipleChoiceQuestion mcQuestion:
                    resultDto.CorrectOptionId = mcQuestion.AnswerOptions
                        .FirstOrDefault(o => o.IsCorrect)?.Id;
                    _logger.LogInformation("MC Question: CorrectOptionId={CorrectOptionId}",
                        resultDto.CorrectOptionId);
                    break;

                case TrueFalseQuestion tfQuestion:
                    resultDto.CorrectAnswer = tfQuestion.CorrectAnswer ? "True" : "False";
                    _logger.LogInformation("T/F Question: CorrectAnswer={CorrectAnswer}",
                        resultDto.CorrectAnswer);
                    break;

                case TypeTheAnswerQuestion ttaQuestion:
                    resultDto.CorrectAnswer = ttaQuestion.CorrectAnswer;
                    if (ttaQuestion.AcceptableAnswers?.Any() == true)
                    {
                        resultDto.AcceptableAnswers = ttaQuestion.AcceptableAnswers.ToList();
                    }
                    _logger.LogInformation("TTA Question: CorrectAnswer={CorrectAnswer}, AcceptableAnswers={AcceptableAnswersCount}",
                        resultDto.CorrectAnswer, resultDto.AcceptableAnswers?.Count ?? 0);
                    break;
            }
        }

        /// <summary>
        /// Value object encapsulating time-related calculations for answer submission
        /// </summary>
        private record TimeContext(DateTime StartTime, TimeSpan TimeTaken, bool IsTimedOut);
    }
}