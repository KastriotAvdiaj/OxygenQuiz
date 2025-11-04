using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Models;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using QuizAPI.Controllers.Questions.Services.AnswerOptions;
using QuizAPI.Controllers.Image.Services;

namespace QuizAPI.Controllers.Questions.Services
{
    public class QuestionService : IQuestionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAnswerOptionService _answerOptionService;
        private readonly IImageService _imageService;

        public QuestionService(ApplicationDbContext context, IMapper mapper, IAnswerOptionService answerOptionService, IImageService imageService)
        {
            _context = context;
            _mapper = mapper;
            _answerOptionService = answerOptionService;
            _imageService = imageService;
        }

        public async Task<List<QuestionBaseDTO>> GetAllQuestionsAsync(string visibility = null)
        {
            IQueryable<QuestionBase> query = _context.Questions.AsNoTracking()
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User);

            if (!string.IsNullOrEmpty(visibility))
            {
                QuestionVisibility visibilityEnum;
                if (Enum.TryParse(visibility, true, out visibilityEnum))
                {
                    query = query.Where(q => q.Visibility == visibilityEnum);
                }
            }

            var questions = await query.ToListAsync();
            return _mapper.Map<List<QuestionBaseDTO>>(questions);
        }

        public async Task<PagedList<QuestionBaseDTO>> GetPaginatedQuestionsAsync(QuestionFilterParams filterParams)
        {
            IQueryable<QuestionBase> query = _context.Questions.AsNoTracking()
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User);

            // Apply filters
            query = ApplyFilters(query, filterParams);

            // Map to DTOs before pagination for better performance
            var projectedQuery = query.ProjectTo<QuestionBaseDTO>(_mapper.ConfigurationProvider);

            // Create and return the paged list
            return await PagedList<QuestionBaseDTO>.CreateAsync(
                projectedQuery,
                filterParams.PageNumber,
                filterParams.PageSize);
        }

        public async Task<QuestionBaseDTO> GetQuestionByIdAsync(int id)
        {
            var question = await _context.Questions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (question == null)
                return null;

            // Map to the correct DTO type based on question type
            switch (question.Type)
            {
                case QuestionType.MultipleChoice:
                    var mcQuestion = await _context.MultipleChoiceQuestions
                        .Include(q => q.AnswerOptions)
                        .FirstOrDefaultAsync(q => q.Id == id);
                    return _mapper.Map<MultipleChoiceQuestionDTO>(mcQuestion);

                case QuestionType.TrueFalse:
                    var tfQuestion = await _context.TrueFalseQuestions
                        .FirstOrDefaultAsync(q => q.Id == id);
                    return _mapper.Map<TrueFalseQuestionDTO>(tfQuestion);

                case QuestionType.TypeTheAnswer:
                    var taQuestion = await _context.TypeTheAnswerQuestions
                        .FirstOrDefaultAsync(q => q.Id == id);
                    return _mapper.Map<TypeTheAnswerQuestionDTO>(taQuestion);

                default:
                    return _mapper.Map<QuestionBaseDTO>(question);
            }
        }

/*NEW PAGINATED METHOD*/
        public async Task<PagedList<MultipleChoiceQuestionDTO>> GetPaginatedMultipleChoiceQuestionsAsync(QuestionFilterParams filterParams)
        {
            IQueryable<MultipleChoiceQuestion> query = _context.MultipleChoiceQuestions.AsNoTracking()
                .Include(q => q.AnswerOptions)
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User);

            // Apply common filters
            query = ApplyFilters(query, filterParams);

            // Map to DTOs
            var projectedQuery = query.ProjectTo<MultipleChoiceQuestionDTO>(_mapper.ConfigurationProvider);

            return await PagedList<MultipleChoiceQuestionDTO>.CreateAsync(
                projectedQuery,
                filterParams.PageNumber,
                filterParams.PageSize);
        }

        public async Task<PagedList<TrueFalseQuestionDTO>> GetPaginatedTrueFalseQuestionsAsync(QuestionFilterParams filterParams)
        {
            IQueryable<TrueFalseQuestion> query = _context.TrueFalseQuestions.AsNoTracking()
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User);

            // Apply common filters
            query = ApplyFilters(query, filterParams);

            // Map to DTOs
            var projectedQuery = query.ProjectTo<TrueFalseQuestionDTO>(_mapper.ConfigurationProvider);

            return await PagedList<TrueFalseQuestionDTO>.CreateAsync(
                projectedQuery,
                filterParams.PageNumber,
                filterParams.PageSize);
        }


        public async Task<PagedList<TypeTheAnswerQuestionDTO>> GetPaginatedTypeTheAnswerQuestionsAsync(QuestionFilterParams filterParams)
        {
            IQueryable<TypeTheAnswerQuestion> query = _context.TypeTheAnswerQuestions.AsNoTracking()
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User);

            // Apply common filters
            query = ApplyFilters(query, filterParams);

            // Map to DTOs
            var projectedQuery = query.ProjectTo<TypeTheAnswerQuestionDTO>(_mapper.ConfigurationProvider);

            return await PagedList<TypeTheAnswerQuestionDTO>.CreateAsync(
                projectedQuery,
                filterParams.PageNumber,
                filterParams.PageSize);
        }

        public async Task<MultipleChoiceQuestionDTO> CreateMultipleChoiceQuestionAsync(MultipleChoiceQuestionCM questionCM, Guid userId)
        {
            // Create the question entity from CM
            var question = _mapper.Map<MultipleChoiceQuestion>(questionCM);

            foreach (var answerOption in question.AnswerOptions)
            {
                answerOption.Question = question;
            }

            // ✅ Validation: Ensure at least one correct answer
            if (!question.AnswerOptions.Any(a => a.IsCorrect))
            {
                throw new InvalidOperationException("At least one answer option must be marked as correct.");
            }

            // Set additional properties
            question.UserId = userId;
            question.CreatedAt = DateTime.UtcNow;
            question.Type = QuestionType.MultipleChoice;

            // Parse visibility
            if (Enum.TryParse(questionCM.Visibility, true, out QuestionVisibility visibility))
            {
                question.Visibility = visibility;
            }
            else
            {
                question.Visibility = QuestionVisibility.Private;
            }

            _context.MultipleChoiceQuestions.Add(question);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrEmpty(questionCM.ImageUrl))
            {
                await _imageService.AssociateImageWithEntityAsync(
                    questionCM.ImageUrl, "Question", question.Id);
            }

            // Fetch the complete entity with relations for DTO mapping
            var createdQuestion = await _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == question.Id);

            return _mapper.Map<MultipleChoiceQuestionDTO>(createdQuestion);
        }


        public async Task<TrueFalseQuestionDTO> CreateTrueFalseQuestionAsync(TrueFalseQuestionCM questionCM, Guid userId)
        {
            var question = _mapper.Map<TrueFalseQuestion>(questionCM);

            question.UserId = userId;
            question.CreatedAt = DateTime.UtcNow;
            question.Type = QuestionType.TrueFalse;

            if (Enum.TryParse(questionCM.Visibility, true, out QuestionVisibility visibility))
            {
                question.Visibility = visibility;
            }
            else
            {
                question.Visibility = QuestionVisibility.Global;
            }

            _context.TrueFalseQuestions.Add(question);
            await _context.SaveChangesAsync();


            if (!string.IsNullOrEmpty(questionCM.ImageUrl))
            {
                await _imageService.AssociateImageWithEntityAsync(
                    questionCM.ImageUrl, "Question", question.Id);
            }

            var createdQuestion = await _context.TrueFalseQuestions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == question.Id);

            return _mapper.Map<TrueFalseQuestionDTO>(createdQuestion);
        }

        public async Task<TypeTheAnswerQuestionDTO> CreateTypeTheAnswerQuestionAsync(TypeTheAnswerQuestionCM questionCM, Guid userId)
        {
            var question = _mapper.Map<TypeTheAnswerQuestion>(questionCM);

            question.UserId = userId;
            question.CreatedAt = DateTime.UtcNow;
            question.Type = QuestionType.TypeTheAnswer;

            if (Enum.TryParse(questionCM.Visibility, true, out QuestionVisibility visibility))
            {
                question.Visibility = visibility;
            }
            else
            {
                question.Visibility = QuestionVisibility.Global;
            }


            _context.TypeTheAnswerQuestions.Add(question);
            await _context.SaveChangesAsync();


            if (!string.IsNullOrEmpty(questionCM.ImageUrl))
            {
                await _imageService.AssociateImageWithEntityAsync(
                    questionCM.ImageUrl, "Question", question.Id);
            }

            var createdQuestion = await _context.TypeTheAnswerQuestions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == question.Id);

            return _mapper.Map<TypeTheAnswerQuestionDTO>(createdQuestion);
        }

        public async Task<MultipleChoiceQuestionDTO> UpdateMultipleChoiceQuestionAsync(
    MultipleChoiceQuestionUM questionUM,
    Guid userId)
        {
            // Permission & load
            var userRole = await GetUserRoleAsync(userId);
            bool isSuperAdmin = userRole == "superadmin";
            var query = _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .Where(q => q.Id == questionUM.Id);
            if (!isSuperAdmin) query = query.Where(q => q.UserId == userId);

            var existingQuestion = await query.FirstOrDefaultAsync();
            if (existingQuestion == null) return null;

            // Map fields
            _mapper.Map(questionUM, existingQuestion);
            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility vis))
                existingQuestion.Visibility = vis;

            // Delegate options sync
            await _answerOptionService.SyncAnswerOptionsAsync(existingQuestion, questionUM.AnswerOptions);

            if (!string.IsNullOrEmpty(questionUM.ImageUrl))
            {
                await _imageService.AssociateImageWithEntityAsync(
                    questionUM.ImageUrl, "Question", existingQuestion.Id);
            }

            // Persist
            await _context.SaveChangesAsync();

            // Reload & return DTO
            var updated = await _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .Include(q => q.Category)
                .Include(q => q.Difficulty)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == existingQuestion.Id);

            return _mapper.Map<MultipleChoiceQuestionDTO>(updated);
        }

        public async Task<TrueFalseQuestionDTO> UpdateTrueFalseQuestionAsync(
    TrueFalseQuestionUM questionUM, Guid userId)
        {
            var userRole = await GetUserRoleAsync(userId);
            bool isSuperAdmin = userRole == "superadmin";

            var query = _context.TrueFalseQuestions
                .Where(q => q.Id == questionUM.Id);

            if (!isSuperAdmin)
                query = query.Where(q => q.UserId == userId);

            var existingQuestion = await query.FirstOrDefaultAsync();

            if (existingQuestion == null)
                return null;

            _mapper.Map(questionUM, existingQuestion);

            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility visibility))
            {
                existingQuestion.Visibility = visibility;
            }

            if (!string.IsNullOrEmpty(questionUM.ImageUrl))
            {
                await _imageService.AssociateImageWithEntityAsync(
                    questionUM.ImageUrl, "Question", existingQuestion.Id);
            }

            await _context.SaveChangesAsync();

            var updatedQuestion = await _context.TrueFalseQuestions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == existingQuestion.Id);

            return _mapper.Map<TrueFalseQuestionDTO>(updatedQuestion);
        }

        public async Task<TypeTheAnswerQuestionDTO> UpdateTypeTheAnswerQuestionAsync(
     TypeTheAnswerQuestionUM questionUM, Guid userId)
        {
            var userRole = await GetUserRoleAsync(userId);
            bool isSuperAdmin = userRole == "superadmin";

            var query = _context.TypeTheAnswerQuestions
                .Where(q => q.Id == questionUM.Id);

            if (!isSuperAdmin)
                query = query.Where(q => q.UserId == userId);

            var existingQuestion = await query.FirstOrDefaultAsync();

            if (existingQuestion == null)
                return null;

            _mapper.Map(questionUM, existingQuestion);

            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility visibility))
            {
                existingQuestion.Visibility = visibility;
            }

            if (!string.IsNullOrEmpty(questionUM.ImageUrl))
            {
                await _imageService.AssociateImageWithEntityAsync(
                    questionUM.ImageUrl, "Question", existingQuestion.Id);
            }

            await _context.SaveChangesAsync();

            var updatedQuestion = await _context.TypeTheAnswerQuestions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == existingQuestion.Id);

            return _mapper.Map<TypeTheAnswerQuestionDTO>(updatedQuestion);
        }


        public async Task<(bool Success, string? ErrorMessage, bool IsCustomMessage)> DeleteQuestionAsync(int id, Guid userId, bool isAdmin)
        {
            var question = await _context.Questions.FirstOrDefaultAsync(q => q.Id == id);

            if (question == null)
                return (false, "Question not found.", true);

            // Check authorization: Admin can delete any, regular users can only delete their own
            if (!isAdmin && question.UserId != userId)
                return (false, "You're not authorized to delete this question.", true);

            var isPartOfQuiz = await _context.QuizQuestions.AnyAsync(qq => qq.QuestionId == id);

            if (isPartOfQuiz)
                return (false, "This question is being used in a quiz and cannot be deleted.", true);

            try
            {
                if (!string.IsNullOrEmpty(question.ImageUrl))
                {
                    await _imageService.DeleteAssociatedImageAsync(question.ImageUrl, "Question", question.Id);
                }

                _context.Questions.Remove(question);
                await _context.SaveChangesAsync();

                return (true, null, false);
            }
            catch (Exception ex)
            {
                return (false, "An error occurred while deleting the question.", false);
            }
        }

        public async Task<List<QuestionBaseDTO>> GetQuestionsByCategoryAsync(int categoryId)
        {
            var questions = await _context.Questions
                .Where(q => q.CategoryId == categoryId)
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .ToListAsync();

            return _mapper.Map<List<QuestionBaseDTO>>(questions);
        }

        public async Task<List<QuestionBaseDTO>> GetQuestionsByDifficultyAsync(int difficultyId)
        {
            var questions = await _context.Questions
                .Where(q => q.DifficultyId == difficultyId)
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .ToListAsync();

            return _mapper.Map<List<QuestionBaseDTO>>(questions);
        }

        public async Task<List<QuestionBaseDTO>> GetQuestionsByUserAsync(Guid userId)
        {
            var questions = await _context.Questions
                .Where(q => q.UserId == userId)
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .ToListAsync();

            return _mapper.Map<List<QuestionBaseDTO>>(questions);
        }

        private static IQueryable<T> ApplyFilters<T>(IQueryable<T> query, QuestionFilterParams filterParams) where T : QuestionBase
        {
            if (!string.IsNullOrEmpty(filterParams.SearchTerm))
            {
                var searchTerm = filterParams.SearchTerm.ToLower();
                query = query.Where(q => q.Text.ToLower().Contains(searchTerm));
            }

            if (filterParams.CategoryId.HasValue)
            {
                query = query.Where(q => q.CategoryId == filterParams.CategoryId.Value);
            }

            if (filterParams.DifficultyId.HasValue)
            {
                query = query.Where(q => q.DifficultyId == filterParams.DifficultyId.Value);
            }

            if (filterParams.LanguageId.HasValue)
            {
                query = query.Where(q => q.LanguageId == filterParams.LanguageId.Value);
            }

            if (!string.IsNullOrEmpty(filterParams.Visibility))
            {
                if (Enum.TryParse(filterParams.Visibility, true, out QuestionVisibility visibilityEnum))
                {
                    query = query.Where(q => q.Visibility == visibilityEnum);
                }
            }

            if (filterParams.Type.HasValue)
            {
                query = query.Where(q => q.Type == filterParams.Type.Value);
            }

            if (filterParams.UserId.HasValue)
            {
                query = query.Where(q => q.UserId == filterParams.UserId.Value);
            }

            return query;
        }

        public async Task<string?> GetUserRoleAsync(Guid userId)
        {
            if (_context.Users == null)
            {
                return null;
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return null;
            }

            return MapRoleIdToRole(user.RoleId);
        }


        ///REMOVE THESE TOO AFTER THE USERS SERVICE IS CREATED
        private static string MapRoleIdToRole(int roleId)
        {
            return roleId switch
            {
                1 => "admin",
                2 => "user",
                3 => "superadmin",
                _ => "user"
            };
        }

        private static int MapRoleToRoleId(string role)
        {
            return role.ToLower() switch
            {
                "admin" => 1,
                "user" => 2,
                "superadmin" => 3,
                _ => 2 // default to user if role is unknown
            };
        }
    }
}
