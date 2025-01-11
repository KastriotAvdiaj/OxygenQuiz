using QuizAPI.DTOs.Question;

namespace QuizAPI.Helpers
{
   
    public static class QuestionHelpers
    {
        public static bool ValidateQuestionDto(QuestionCM questionDto)
        {
            if (questionDto == null)
                return false;

            if (string.IsNullOrWhiteSpace(questionDto.Text))
                return false;

            if (questionDto.AnswerOptions == null || questionDto.AnswerOptions.Count < 2)
                return false;

            return ValidateAnswerOptions(questionDto.AnswerOptions);
        }

        public static bool ValidateAnswerOptions(ICollection<AnswerOptionCM> answerOptions)
        {
            int correctAnswers = answerOptions.Count(o => o.IsCorrect);
            int incorrectAnswers = answerOptions.Count(o => !o.IsCorrect);

            return correctAnswers == 1 && incorrectAnswers >= 1;
        }
    }
}
