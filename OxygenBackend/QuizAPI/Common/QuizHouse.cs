using QuizAPI.Models.Quiz;

namespace QuizAPI.Common
{
    /// <summary>House quizzes: made by staff, picked at creation. docs/media/moderation.md.</summary>
    public static class QuizHouse
    {
        public static void Stamp(Quiz quiz, bool creatorIsStaff, DateTime now)
        {
            quiz.IsHouse = creatorIsStaff;
            if (creatorIsStaff)
            {
                quiz.IsPicked = true;
                quiz.PickedAt = now;
            }
        }
    }
}
