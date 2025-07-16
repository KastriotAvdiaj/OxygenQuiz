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

        public async Task<Result<CurrentQuestionDto>> GetNextQuestionAsync(Guid sessionId)
        {
            try
            {
                var session = await _context.QuizSessions
                    .Include(s => s.Quiz)
                        .ThenInclude(q => q.QuizQuestions)
                    .Include(s => s.UserAnswers)
                    .FirstOrDefaultAsync(s => s.Id == sessionId);

                if (session == null)
                    return Result<CurrentQuestionDto>.ValidationFailure("Session not found.");
                if (session.IsCompleted)
                    return Result<CurrentQuestionDto>.ValidationFailure("This quiz session is already completed.");
                if (session.CurrentQuizQuestionId != null)
                    return Result<CurrentQuestionDto>.ValidationFailure("An answer for the current question is still pending.");

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
                    .AsNoTracking()
                    .Include(qq => qq.Question)
                        .ThenInclude(q => (q as MultipleChoiceQuestion)!.AnswerOptions)
                    .FirstAsync(qq => qq.Id == nextQuizQuestion.Id);

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
                    var correctAnswer = await _context.AnswerOptions
                       .AsNoTracking()
                       .FirstOrDefaultAsync(o => o.QuestionId == taq.Id && o.IsCorrect);
                    isCorrect = string.Equals(correctAnswer?.Text, answer.SubmittedAnswer, StringComparison.OrdinalIgnoreCase);
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

                var existingSession = await _context.QuizSessions.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.QuizId == model.QuizId && s.UserId == model.UserId && !s.IsCompleted);
                if (existingSession != null)
                    return Result<QuizSessionDto>.ValidationFailure("You already have an active session for this quiz.");

                var session = _mapper.Map<QuizSession>(model);
                session.Id = Guid.NewGuid();
                session.StartTime = DateTime.UtcNow;
                session.TotalScore = 0;
                session.IsCompleted = false;

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