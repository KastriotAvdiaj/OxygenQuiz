namespace QuizAPI.DTOs.Question
{
    /// <summary>
    /// Whether the quiz builder may edit one saved question in place, for the caller
    /// (<see cref="QuizAPI.Common.QuestionEditRule"/>). <c>Reason</c> is null when it may, else
    /// "NotYours" | "Played" | "UsedElsewhere".
    /// </summary>
    public class QuestionEditabilityDTO
    {
        public int QuestionId { get; set; }
        public bool CanEditInPlace { get; set; }
        public string? Reason { get; set; }
        /// <summary>Other live quizzes using it. Only filled for the caller's own questions.</summary>
        public int OtherQuizCount { get; set; }
        /// <summary>
        /// Picked live quizzes using it (only for the caller's own questions). Saving an edit
        /// without <c>quiz:autopick</c> unpicks them, so the question editors warn with this.
        /// </summary>
        public int PickedQuizCount { get; set; }
    }
}
