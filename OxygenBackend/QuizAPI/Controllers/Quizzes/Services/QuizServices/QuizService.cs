using QuizAPI.Controllers.Questions.Services;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using NuGet.Packaging;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.User;

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
                IsPublished = q.IsPublished,
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
                ShuffleQuestions = quizCM.ShuffleQuestions,
                ShuffleAnswers = quizCM.ShuffleAnswers,
                IsPublished = true,
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
                IsPublished = quizEntity.IsPublished,
                CreatedAt = quizEntity.CreatedAt,
                NumberOfQuestions = quizEntity.QuizQuestions?.Count() ?? 0
            };

            return quizDto;
        }

        public async Task<List<QuizQuestionDTO>> GetQuizQuestionsAsync(int quizId)
        {
            var quizQuestions = await _context.QuizQuestions
                .Where(qq => qq.QuizId == quizId)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Difficulty)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Language)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.User)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.Category)
                .Include(qq => qq.Question)
                    .ThenInclude(q => q.AnswerOptions)
                .ToListAsync();

            var quizQuestionDtos = new List<QuizQuestionDTO>();

            foreach (var qq in quizQuestions)
            {
                var questionDto = _questionService.MapToQuestionDTO(qq.Question);
                quizQuestionDtos.Add(new QuizQuestionDTO
                {
                    QuizId = qq.QuizId,
                    QuestionId = qq.QuestionId,
                    Score = qq.Score,
                    Question = questionDto
                });
            }

            return quizQuestionDtos;
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
                IsPublished = quiz.IsPublished,
                CreatedAt = quiz.CreatedAt,
                NumberOfQuestions = quiz.QuizQuestions.Count
            };
        }

        public async Task<List<QuizDTO>> GetQuizForEachCategoryAsync()
        {
            // Get quizzes including their related Category and Language info.
            var quizzes = await _context.Quizzes
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.QuizQuestions)
                .ToListAsync();

            // Group quizzes by category and select the first quiz from each group.
            var groupedQuizzes = quizzes
                .GroupBy(q => q.CategoryId)
                .Select(g => g.First())
                .ToList();

            // Map to DTOs.
            var quizDtos = groupedQuizzes.Select(q => new QuizDTO
            {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                Category = q.Category.Name,
                Language = q.Language.Language,
                IsPublished = q.IsPublished,
                CreatedAt = q.CreatedAt,
                NumberOfQuestions = q.QuizQuestions?.Count ?? 0
            }).ToList();

            return quizDtos;
        }

        /*   public async Task<bool> ValidateQuizSlugAsync(string slug)
           {
               return !await _context.Quizzes.AnyAsync(q => q.Slug == slug);
           }*/

    }
}
