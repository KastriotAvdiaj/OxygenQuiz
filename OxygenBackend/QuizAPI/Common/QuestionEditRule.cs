namespace QuizAPI.Common
{
    /// <summary>
    /// Why the quiz builder may not edit a saved question in place. <see cref="None"/> = it may.
    /// </summary>
    public enum QuestionEditLock
    {
        None,
        /// <summary>Someone else's question. Their other quizzes, and their bank, are theirs.</summary>
        NotYours,
        /// <summary>Players have answered it. Changing it would rewrite what their results show.</summary>
        Played,
        /// <summary>Another quiz uses it too. An edit here would change that quiz as well.</summary>
        UsedElsewhere,
    }

    /// <summary>What the rule needs to know about one saved question.</summary>
    /// <param name="OtherQuizCount">Live quizzes other than the one being built that contain it.</param>
    /// <param name="Played">Any answer row anywhere points at it.</param>
    public sealed record QuestionEditFacts(int QuestionId, Guid OwnerId, int OtherQuizCount, bool Played);

    /// <summary>
    /// The quiz builder's rule for a saved question (docs/quiz/quiz-editing.md, "Which questions
    /// the builder edits directly"; ADR 0031):
    ///
    /// <b>Edit in place</b> only when nothing else can notice — it is <b>yours</b>, <b>no other
    /// quiz uses it</b>, and <b>nobody has answered it</b>. Otherwise the builder offers an edit
    /// <b>as a copy</b> for this quiz only. How the question was made (inside a quiz, on the
    /// Questions page, from the bank) is deliberately not part of it: it isn't recorded, and it
    /// isn't what makes an edit safe.
    ///
    /// Owner only — admins included. <c>question:update:any</c> still lets an admin edit any
    /// question from the Questions page, where "everywhere" is the point; the builder edits as the
    /// quiz's author.
    ///
    /// Order of the reasons is the order a user should hear them: whose it is first, then the
    /// players, then other quizzes.
    /// </summary>
    public static class QuestionEditRule
    {
        public static QuestionEditLock Decide(QuestionEditFacts? facts, Guid callerId)
        {
            if (facts is null || facts.OwnerId != callerId) return QuestionEditLock.NotYours;
            if (facts.Played) return QuestionEditLock.Played;
            if (facts.OtherQuizCount > 0) return QuestionEditLock.UsedElsewhere;
            return QuestionEditLock.None;
        }

        /// <summary>The refusal an in-place save gets when the rule says no (409).</summary>
        public static string RefusalMessage(QuestionEditLock reason) => reason switch
        {
            QuestionEditLock.NotYours => "This question belongs to someone else. Edit it as a copy for this quiz.",
            QuestionEditLock.Played => "Players have already answered this question. Edit it as a copy for this quiz.",
            QuestionEditLock.UsedElsewhere => "Another quiz uses this question. Edit it as a copy for this quiz.",
            _ => string.Empty,
        };
    }
}
