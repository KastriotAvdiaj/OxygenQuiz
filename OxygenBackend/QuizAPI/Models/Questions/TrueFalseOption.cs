namespace QuizAPI.Models
{
    /// <summary>
    /// The synthetic answer-option contract for True/False questions during play.
    ///
    /// A <see cref="TrueFalseQuestion"/> stores no <c>AnswerOption</c> rows — the API fabricates
    /// exactly two options with these fixed ids when it sends a T/F question to the client
    /// (see <c>EntityMappers.ToCurrentQuestionDto</c>) and maps the chosen id back to a boolean
    /// answer string on submit (see <c>SubmitAnswerService.NormalizeTrueFalseAnswer</c>).
    ///
    /// These are therefore NOT database ids. Defining the contract here keeps it in one place
    /// instead of as bare 1/2 literals duplicated across the mapper, the submit service, and the
    /// front-end. If this ever changes, change it here and mirror it on the client.
    /// </summary>
    public static class TrueFalseOption
    {
        public const int TrueId = 1;
        public const int FalseId = 2;

        public const string TrueText = "True";
        public const string FalseText = "False";

        /// <summary>
        /// Maps a selected option id to the "True"/"False" answer string used by grading.
        /// Anything that isn't the True id is treated as False (preserving the original
        /// <c>== 1 ? "True" : "False"</c> behaviour, including null/timeout selections).
        /// </summary>
        public static string ToAnswerText(int? selectedOptionId) =>
            selectedOptionId == TrueId ? TrueText : FalseText;
    }
}
