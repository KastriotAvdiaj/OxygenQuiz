using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services
{
    public class QuestionService : IQuestionService
    {
        private readonly ApplicationDbContext _context;

        public QuestionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Question> CreateQuestionAsync(
            QuestionCM newQuestionCM,
            string userId,
            int categoryId,
            int difficultyId,
            int languageId
            )
        {


            /*//PROBLEM :
            The newQuestionCM has a langauge, difficulty and category (BUT ONLY AS STRINGS
            FROM THE FRONTEND),
            So maybe creating a new DTO here so that we are not sending 
            them from the POST endopint to this sercive at all.
            //*/

            // Create the new question entity.
            var question = new Question
            {
                Text = newQuestionCM.Text,
                DifficultyId = difficultyId,
                LanguageId = languageId,
                CreatedAt = DateTime.UtcNow,
                CategoryId = categoryId,
                UserId = Guid.Parse(userId),
                Visibility = QuestionVisibility.Global,  // Assume new questions are public since this is authorized to only admins.
            };

            foreach (var optionDto in newQuestionCM.AnswerOptions)
            {
                var answerOption = new AnswerOption
                {
                    Text = optionDto.Text,
                    IsCorrect = optionDto.IsCorrect,
                    Question = question
                };
                question.AnswerOptions.Add(answerOption);
            }

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            return question;
        }

        public async Task<Question> CreateQuestionAsync(
            QuestionCM newQuestionCM,
            string userId,
            QuestionVisibility visibility
            )
        {

            var languageId = await _context.QuestionLanguages
            .Where(l => l.Language == newQuestionCM.Language)
            .Select(l => l.Id)
            .SingleOrDefaultAsync();

            var categoryId = await _context.QuestionCategories
            .Where(c => c.Name == newQuestionCM.Category)
            .Select(c => c.Id)
            .SingleOrDefaultAsync();

            var difficultyId = await _context.QuestionDifficulties.
                Where(d=> d.Level == newQuestionCM.Difficulty)
                .Select(d=>d.ID)
                .SingleOrDefaultAsync();

            // Create the new question entity.
            var question = new Question
            {
                Text = newQuestionCM.Text,
                DifficultyId = difficultyId,
                LanguageId = languageId,
                CreatedAt = DateTime.UtcNow,
                CategoryId = categoryId,
                UserId = Guid.Parse(userId),
                Visibility = visibility,
            };

            foreach (var optionDto in newQuestionCM.AnswerOptions)
            {
                var answerOption = new AnswerOption
                {
                    Text = optionDto.Text,
                    IsCorrect = optionDto.IsCorrect,
                    Question = question
                };
                question.AnswerOptions.Add(answerOption);
            }

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            return question;
        }
    }
}
