using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services.AnswerOptions
{
    public class AnswerOptionService: IAnswerOptionService      
    {
        private readonly ApplicationDbContext _context;

        public AnswerOptionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AnswerOption> CreateAnswerOptionAsync(
    AnswerOption newAnswerOptionCM,
    int questionId
)
        {

            var question = await _context.Questions.FirstOrDefaultAsync(q => q.Id == questionId) ?? throw new Exception("Question not found.");

            var answerOption = new AnswerOption
            {
                Text = newAnswerOptionCM.Text,
                IsCorrect = newAnswerOptionCM.IsCorrect,
                Question = question
            };

   
            question.AnswerOptions.Add(answerOption);
            await _context.SaveChangesAsync();

            return answerOption;
        }

        public async Task<List<AnswerOption>> CreateAnswerOptionsAsync(
            List<AnswerOption> newAnswerOptions,
            int questionId
        )
        {
            var createdOptions = new List<AnswerOption>();

           
            foreach (var optionDto in newAnswerOptions)
            {
                var createdOption = await CreateAnswerOptionAsync(optionDto, questionId);
                createdOptions.Add(createdOption);
            }

            return createdOptions;
        }
    }
}
