using QuizAPI.Exceptions;

namespace QuizAPI.Services.FeaturedQuizzes
{
    /// <summary>
    /// What it takes to remove a featured quiz from the quiz home page, by either route. Admins may
    /// still edit its content — edits are versioned and lose nothing (docs/quiz/quiz-editing.md) —
    /// but deleting or unpublishing it, or deleting one of the OxygenQuiz account's questions, is
    /// SuperAdmin-only. See docs/quiz/featured-quizzes.md, "Who can change a featured quiz".
    /// </summary>
    public static class FeaturedQuizRules
    {
        public static void EnsureCanDelete(bool isSuperAdmin)
        {
            if (!isSuperAdmin)
                throw new ForbiddenException("Only a SuperAdmin can delete a featured quiz.");
        }

        public static void EnsureCanChangeStatus(bool isSuperAdmin)
        {
            if (!isSuperAdmin)
                throw new ForbiddenException("Only a SuperAdmin can change whether a featured quiz is published.");
        }

        public static void EnsureCanDeleteQuestion(Guid questionOwnerId, bool isSuperAdmin)
        {
            if (questionOwnerId == SystemAccount.Id && !isSuperAdmin)
                throw new ForbiddenException("Only a SuperAdmin can delete one of OxygenQuiz's questions.");
        }
    }
}
