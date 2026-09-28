using QuizAPI.Exceptions;

namespace QuizAPI.Models
{
    /// <summary>
    /// The rules for a question's optional explanation — the "why" a player sees after answering.
    ///
    /// <para><b>Optional, and stays that way.</b> A question without one plays exactly as before;
    /// existing rows are <c>null</c> and nothing back-fills them. See
    /// docs/quiz/question-explanations.md.</para>
    ///
    /// <para><b>It gives the answer away</b>, so it is served only where the answer key is: in the
    /// instant-feedback result, and in the session DTOs once they reveal
    /// (<c>QuizSessionMappers.ProjectUserAnswer</c>). Never in <c>CurrentQuestionDto</c>.</para>
    ///
    /// <para>Every write path (question create/update, the quiz AI import, the data-transfer import)
    /// goes through here, like <see cref="AcceptableAnswerRules"/>. The builder caps the textarea at
    /// <see cref="MaxLength"/> too; that is the fast feedback, this is the gate.</para>
    /// </summary>
    public static class QuestionExplanation
    {
        /// <summary>Room for a few sentences. Mirrored by <c>EXPLANATION_MAX_LENGTH</c> in the frontend.</summary>
        public const int MaxLength = 1000;

        public static readonly string TooLongMessage =
            $"An explanation can be at most {MaxLength} characters.";

        /// <summary>
        /// Trims, and turns blank into <c>null</c> so "no explanation" has one representation.
        /// Throws <see cref="AppValidationException"/> when the author wrote more than
        /// <see cref="MaxLength"/>.
        /// </summary>
        public static string? Normalize(string? explanation)
        {
            var trimmed = explanation?.Trim();
            if (string.IsNullOrEmpty(trimmed)) return null;
            if (trimmed.Length > MaxLength) throw new AppValidationException(TooLongMessage);
            return trimmed;
        }

        /// <summary>
        /// As <see cref="Normalize"/>, but cuts an over-long value instead of rejecting it — for
        /// text a model wrote, where failing a whole quiz import over one long explanation would
        /// punish the author for the model's verbosity.
        /// </summary>
        public static string? NormalizeAndTruncate(string? explanation)
        {
            var trimmed = explanation?.Trim();
            if (string.IsNullOrEmpty(trimmed)) return null;
            return trimmed.Length <= MaxLength ? trimmed : trimmed[..MaxLength].TrimEnd();
        }
    }
}
