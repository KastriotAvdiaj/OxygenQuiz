using QuizAPI.Controllers.Questions.Services;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using NuGet.Packaging;
using QuizAPI.DTOs.Question;

namespace QuizAPI.Controllers.Quizzes.Services.QuizServices
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

        public async Task<List<QuizDTO>> GetQuizzesAsync()
        {
            var quizzes = await _context.Quizzes
                .Include(q => q.QuizQuestions)
                    .ThenInclude(qq => qq.Question)
                        .ThenInclude(q => q.AnswerOptions)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .ToListAsync();

            return quizzes.Select(q => new QuizDTO
            {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                Category = q.Category.Name,
                Language = q.Language.Language,
                TimeLimit = q.TimeLimit,
                IsPublished = q.IsPublished,
                PassingScore = q.PassingScore,
                CreatedAt = q.CreatedAt,
                NumberOfQuestions = q.QuizQuestions.Count
            }).ToList();
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
                IsPublished = true,
                PassingScore = quizCM.PassingScore,
                CreatedAt = DateTime.UtcNow,
                UserId = Guid.Parse(userId),
                QuizQuestions = new List<QuizQuestion>()
            };

            // Process public questions
            var publicQuestions = await ProcessPublicQuestions(quizCM.PublicQuestions);
            quiz.QuizQuestions.AddRange(publicQuestions);

            // Process private questions
            var privateQuestions = await ProcessPrivateQuestions(quizCM.PrivateQuestions, userId);
            quiz.QuizQuestions.AddRange(privateQuestions);

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


        private async Task<List<QuizQuestion>> ProcessPublicQuestions
            (List<PublicQuestionWithScore> publicQuestions)
        {
            if (publicQuestions == null || !publicQuestions.Any())
                return new List<QuizQuestion>();

            var questionIds = publicQuestions.Select(q => q.QuestionId).ToList();
            var validQuestions = await _context.Questions
                .Where(q => questionIds.Contains(q.Id)
                && q.Visibility == QuestionVisibility.Global)
                .ToListAsync();

            if (validQuestions.Count != publicQuestions.Count)
                throw new ArgumentException("Invalid public question(s)");

            return publicQuestions.Select(pq => new QuizQuestion
            {
                QuestionId = pq.QuestionId,
                Score = pq.Score
            }).ToList();
        }


        private async Task<List<QuizQuestion>> ProcessPrivateQuestions
            (List<QuestionCMWithScore> privateQuestions, string userId)
        {
            var quizQuestions = new List<QuizQuestion>();

            if (privateQuestions == null || !privateQuestions.Any())
                return quizQuestions;

            foreach (var questionCM in privateQuestions)
            {
                var question = await _questionService.CreateQuestionAsync(
                    questionCM,
                    userId,
                    visibility: QuestionVisibility.Private);

                quizQuestions.Add(new QuizQuestion
                {
                    QuestionId = question.Id,
                    Score = questionCM.Score
                });
            }

            return quizQuestions;
        }

        public async Task<QuizDTO?> GetQuizAsync(int id)
        {

            var quizEntity = await _context.Quizzes
                .Include(q => q.QuizQuestions)
                    .Include(q => q.Category)
                        .Include(q => q.Language) 
                            .FirstOrDefaultAsync(q => q.Id == id);

            if (quizEntity == null)
            {
                return null;
            }

            var quizDto = new QuizDTO
            {
                Id = quizEntity.Id,
                Title = quizEntity.Title,
                Description = quizEntity.Description,
                Category = quizEntity.Category.Name,
                Language = quizEntity.Language.Language,
                TimeLimit = quizEntity.TimeLimit,
                IsPublished = quizEntity.IsPublished,
                PassingScore = quizEntity.PassingScore,
                CreatedAt = quizEntity.CreatedAt,
                NumberOfQuestions = quizEntity.QuizQuestions?.Count() ?? 0
            };

            return quizDto;
        }

        public async Task<QuizDTO> MapToQuizDTO(Quiz quiz)
        {
            var language = await _context.QuestionLanguages
               .Where(l => l.Id == quiz.LanguageId)
               .Select(l => l.Language)
               .AsNoTracking()
               .FirstOrDefaultAsync();

            var category = await _context.QuestionCategories
            .Where(c => c.Id == quiz.CategoryId)
            .Select(l => l.Name)
            .AsNoTracking()
            .FirstOrDefaultAsync();

            return new QuizDTO
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Description = quiz.Description,
                /*Slug = quiz.Slug,*/
                Category = category,
                Language = language,
                TimeLimit = quiz.TimeLimit,
                IsPublished = quiz.IsPublished,
                PassingScore = quiz.PassingScore,
                CreatedAt = quiz.CreatedAt,
                NumberOfQuestions = quiz.QuizQuestions.Count
            };
        }

        /*   public async Task<bool> ValidateQuizSlugAsync(string slug)
           {
               return !await _context.Quizzes.AnyAsync(q => q.Slug == slug);
           }*/

    }
}
