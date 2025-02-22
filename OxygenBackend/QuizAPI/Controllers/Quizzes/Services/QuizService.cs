using QuizAPI.Controllers.Questions.Services;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using NuGet.Packaging;
using QuizAPI.DTOs.Question;

namespace QuizAPI.Controllers.Quizzes.Services
{
    public class QuizService : IQuizService
    {
        private readonly ApplicationDbContext _context;
        private readonly IQuestionService _questionService;

        public QuizService(ApplicationDbContext context, IQuestionService questionService)
        {
            _context = context;
            _questionService = questionService;
        }

        public async Task<Quiz> CreateQuizAsync(QuizCM quizCM, string userId)
        {
            var quiz = new Quiz
            {
                Title = quizCM.Title,
                Description = quizCM.Description,
                /*Slug = quizCM.Slug,*/
                CategoryId = quizCM.CategoryId,
                LanguageId = quizCM.LanguageId,
                TimeLimit = quizCM.TimeLimit,
                ShuffleQuestions = quizCM.ShuffleQuestions,
                ShuffleAnswers = quizCM.ShuffleAnswers,
                IsPublished = quizCM.IsPublished,
                PassingScore = quizCM.PassingScore,
                CreatedAt = DateTime.UtcNow,
                UserId = Guid.Parse(userId),
                QuizQuestions = new List<QuizQuestion>()
            };

            // Process public questions
            var publicQuestions = await ProcessPublicQuestions(quizCM.PublicQuestionIds);
            quiz.QuizQuestions.AddRange(publicQuestions.Select(q => new QuizQuestion { Question = q }));

            // Process private questions
            var privateQuestions = await ProcessPrivateQuestions(quizCM.PrivateQuestions, userId);
            quiz.QuizQuestions.AddRange(privateQuestions.Select(q => new QuizQuestion { Question = q }));

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();

            return quiz;
        }

        public async Task<bool> ValidatePublicQuestionsAsync(IEnumerable<int> questionIds)
        {
            var validCount = await _context.Questions
                .CountAsync(q => questionIds.Contains(q.Id) && q.Visibility == QuestionVisibility.Global);

            return validCount == questionIds.Count();
        }

        /*   public async Task<bool> ValidateQuizSlugAsync(string slug)
           {
               return !await _context.Quizzes.AnyAsync(q => q.Slug == slug);
           }*/

        private async Task<List<Question>> ProcessPublicQuestions(List<int> publicQuestionIds)
        {
            // If there are no public question IDs, return an empty list.
            if (publicQuestionIds == null || !publicQuestionIds.Any())
                return new List<Question>();

            // Retrieve questions that match the IDs and are marked as Global.
            var questions = await _context.Questions
                .Where(q => publicQuestionIds.Contains(q.Id) && q.Visibility == QuestionVisibility.Global)
                .ToListAsync();

            // Ensure that every provided ID corresponds to a valid global question.
            if (questions.Count != publicQuestionIds.Count)
            {
                throw new ArgumentException("One or more public questions are invalid or not found");
            }

            return questions;
        }

        private async Task<List<Question>> ProcessPrivateQuestions(List<QuestionCM> privateQuestions, string userId)
        {
            var questions = new List<Question>();

            // If there are no private questions, simply return an empty list.
            if (privateQuestions == null || !privateQuestions.Any())
                return questions;

            // For each private question provided, create the question with Private visibility.
            foreach (var questionCM in privateQuestions)
            {
                var question = await _questionService.CreateQuestionAsync(
                    questionCM,
                    userId,
                    visibility: QuestionVisibility.Private);
                questions.Add(question);
            }

            return questions;
        }

    }
}
