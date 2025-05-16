using QuizAPI.DTOs.Question;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Questions.Services.AnswerOptions
{
    public interface IAnswerOptionService
    {
        Task<AnswerOption> CreateAnswerOptionAsync(
            AnswerOptionCM newAnswerOptionCM,
            int questionId
            );

        Task<List<AnswerOption>> CreateAnswerOptionsAsync(
            List<AnswerOptionCM> newAnswerOption,
            int questionId
            );

        Task SyncAnswerOptionsAsync(MultipleChoiceQuestion question, IEnumerable<AnswerOptionUM> incomingOptions);
        Task<AnswerOption> UpdateAnswerOptionAsync(AnswerOption answerOption);
    }
}
