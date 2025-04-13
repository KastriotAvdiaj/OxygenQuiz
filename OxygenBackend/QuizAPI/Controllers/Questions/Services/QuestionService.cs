using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.Models;
using AutoMapper;

namespace QuizAPI.Controllers.Questions.Services
{
    public class QuestionService : IQuestionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;

        public QuestionService(ApplicationDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<List<QuestionBaseDTO>> GetAllQuestionsAsync(string visibility = null)
        {
            IQueryable<QuestionBase> query = _context.Questions
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

        public async Task<List<MultipleChoiceQuestionDTO>> GetMultipleChoiceQuestionsAsync()
        {
            var questions = await _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .ToListAsync();

            return _mapper.Map<List<MultipleChoiceQuestionDTO>>(questions);
        }

        public async Task<List<TrueFalseQuestionDTO>> GetTrueFalseQuestionsAsync()
        {
            var questions = await _context.TrueFalseQuestions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .ToListAsync();

            return _mapper.Map<List<TrueFalseQuestionDTO>>(questions);
        }

        public async Task<List<TypeTheAnswerQuestionDTO>> GetTypeTheAnswerQuestionsAsync()
        {
            var questions = await _context.TypeTheAnswerQuestions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .ToListAsync();

            return _mapper.Map<List<TypeTheAnswerQuestionDTO>>(questions);
        }

        public async Task<MultipleChoiceQuestionDTO> CreateMultipleChoiceQuestionAsync(MultipleChoiceQuestionCM questionCM, Guid userId)
        {
            // Create the question entity from CM
            var question = _mapper.Map<MultipleChoiceQuestion>(questionCM);

            foreach (var answerOption in question.AnswerOptions)
            {
                answerOption.Question = question;
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
                question.Visibility = QuestionVisibility.Global;
            }

            _context.MultipleChoiceQuestions.Add(question);
            await _context.SaveChangesAsync();

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

            var createdQuestion = await _context.TypeTheAnswerQuestions
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == question.Id);

            return _mapper.Map<TypeTheAnswerQuestionDTO>(createdQuestion);
        }

        public async Task<MultipleChoiceQuestionDTO> UpdateMultipleChoiceQuestionAsync(MultipleChoiceQuestionUM questionUM, Guid userId)
        {
            var existingQuestion = await _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .FirstOrDefaultAsync(q => q.Id == questionUM.Id && q.UserId == userId);

            if (existingQuestion == null)
                return null;

            // Update basic properties
            _mapper.Map(questionUM, existingQuestion);

            // Parse visibility
            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility visibility))
            {
                existingQuestion.Visibility = visibility;
            }

            // Handle answer options - remove existing ones
            _context.AnswerOptions.RemoveRange(existingQuestion.AnswerOptions);

            // Add updated answer options
            existingQuestion.AnswerOptions = _mapper.Map<List<AnswerOption>>(questionUM.AnswerOptions);

            await _context.SaveChangesAsync();

            // Refresh the entity with related data
            var updatedQuestion = await _context.MultipleChoiceQuestions
                .Include(q => q.AnswerOptions)
                .Include(q => q.Difficulty)
                .Include(q => q.Category)
                .Include(q => q.Language)
                .Include(q => q.User)
                .FirstOrDefaultAsync(q => q.Id == existingQuestion.Id);

            return _mapper.Map<MultipleChoiceQuestionDTO>(updatedQuestion);
        }

        public async Task<TrueFalseQuestionDTO> UpdateTrueFalseQuestionAsync(TrueFalseQuestionUM questionUM, Guid userId)
        {
            var existingQuestion = await _context.TrueFalseQuestions
                .FirstOrDefaultAsync(q => q.Id == questionUM.Id && q.UserId == userId);

            if (existingQuestion == null)
                return null;

            _mapper.Map(questionUM, existingQuestion);

            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility visibility))
            {
                existingQuestion.Visibility = visibility;
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

        public async Task<TypeTheAnswerQuestionDTO> UpdateTypeTheAnswerQuestionAsync(TypeTheAnswerQuestionUM questionUM, Guid userId)
        {
            var existingQuestion = await _context.TypeTheAnswerQuestions
                .FirstOrDefaultAsync(q => q.Id == questionUM.Id && q.UserId == userId);

            if (existingQuestion == null)
                return null;

            _mapper.Map(questionUM, existingQuestion);

            if (Enum.TryParse(questionUM.Visibility, true, out QuestionVisibility visibility))
            {
                existingQuestion.Visibility = visibility;
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

        public async Task<bool> DeleteQuestionAsync(int id, Guid userId)
        {
            var question = await _context.Questions
                .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

            if (question == null)
                return false;

            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();
            return true;
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
    }
}
