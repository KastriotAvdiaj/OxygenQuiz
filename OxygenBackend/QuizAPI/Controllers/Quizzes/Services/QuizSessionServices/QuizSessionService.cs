/*namespace QuizAPI.Controllers.Quizzes.Services.QuizSessionServices
{
    using Microsoft.EntityFrameworkCore;
    using QuizAPI.Data;
    using QuizAPI.Models.Quiz;
    using System;
    using System.Linq;
    using System.Threading.Tasks;

    public class QuizSessionService : IQuizSessionService
    {
        private readonly ApplicationDbContext _context;

        public QuizSessionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<QuizSession> StartQuizSessionAsync(int quizId, Guid userId)
        {
            // Ensure that the quiz exists, is published, and active.
            var quiz = await _context.Quizzes
                .Include(q => q.QuizQuestions)
                    .ThenInclude(qq => qq.Question)
                .FirstOrDefaultAsync(q => q.Id == quizId && q.IsPublished && q.IsActive);

            if (quiz == null)
            {
                throw new Exception("Quiz not found or not available.");
            }

            // Create a new quiz session.
            var session = new QuizSession
            {
                Id = Guid.NewGuid(),
                QuizId = quizId,
                UserId = userId,
                StartTime = DateTime.UtcNow,
                TotalScore = 0
            };

            _context.QuizSessions.Add(session);
            await _context.SaveChangesAsync();

            return session;
        }

        public async Task<UserAnswer> SubmitAnswerAsync(Guid sessionId, int questionId, int selectedOptionId)
        {
            // Find the session and include existing answers to prevent duplicates.
            var session = await _context.QuizSessions
                .Include(s => s.UserAnswers)
                .FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null)
            {
                throw new Exception("Session not found.");
            }

            // Prevent submission if the session has already been finished.
            if (session.EndTime != null)
            {
                throw new Exception("Quiz session has already been finished.");
            }

            // Prevent duplicate answers for the same question.
            if (session.UserAnswers.Any(ua => ua.QuestionId == questionId))
            {
                throw new Exception("Answer for this question has already been submitted.");
            }

            // Load the question with its answer options.
            var question = await _context.Questions
                .Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == questionId);
            if (question == null)
            {
                throw new Exception("Question not found.");
            }

            // Verify the selected option exists and belongs to the question.
            var selectedOption = question.AnswerOptions.FirstOrDefault(ao => ao.Id == selectedOptionId);
            if (selectedOption == null)
            {
                throw new Exception("Selected answer option does not belong to this question.");
            }

            // Determine if the answer is correct.
            bool isCorrect = selectedOption.IsCorrect;

            // Get the score for this question from the QuizQuestion relationship.
            var quizQuestion = await _context.QuizQuestions
                .FirstOrDefaultAsync(qq => qq.QuizId == session.QuizId && qq.QuestionId == questionId);
            if (quizQuestion == null)
            {
                throw new Exception("Question not found in this quiz.");
            }

            // Record the user's answer.
            var userAnswer = new UserAnswer
            {
                SessionId = sessionId,
                QuestionId = questionId,
                SelectedOptionId = selectedOptionId,
                IsCorrect = isCorrect,
                Score = isCorrect ? quizQuestion.Score : 0
            };

            _context.UserAnswers.Add(userAnswer);
            await _context.SaveChangesAsync();

            return userAnswer;
        }

        public async Task<int> FinishQuizSessionAsync(Guid sessionId)
        {
            // Load the session along with its answers.
            var session = await _context.QuizSessions
                .Include(s => s.UserAnswers)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null)
            {
                throw new Exception("Session not found.");
            }

            // Prevent finishing an already finished session.
            if (session.EndTime != null)
            {
                throw new Exception("Quiz session has already been finished.");
            }

            // Calculate the total score from all recorded answers.
            int totalScore = session.UserAnswers.Sum(a => a.Score);

            // Finalize the session.
            session.EndTime = DateTime.UtcNow;
            session.TotalScore = totalScore;

            await _context.SaveChangesAsync();

            return totalScore;
        }
    }
}*/