namespace QuizAPI.Services.Audit
{
    /// <summary>
    /// Canonical audit action verbs. Always reference these constants instead of raw
    /// strings — the audit query filters by exact Action text, so a typo silently
    /// breaks searching. Convention: "EntityPastTenseVerb" in PascalCase.
    /// </summary>
    public static class AuditActions
    {
        // Authentication / account
        public const string UserLoggedIn = "UserLoggedIn";
        public const string LoginFailed = "LoginFailed";
        public const string UserSignedUp = "UserSignedUp";
        public const string UserCreated = "UserCreated";
        public const string UserDeleted = "UserDeleted";

        // Questions
        public const string QuestionCreated = "QuestionCreated";
        public const string QuestionUpdated = "QuestionUpdated";
        public const string QuestionDeleted = "QuestionDeleted";

        // Quizzes
        public const string QuizCreated = "QuizCreated";
        public const string QuizUpdated = "QuizUpdated";
        public const string QuizDeleted = "QuizDeleted";

        // Roles (definitions). Per-user role grants are captured by UserCreated.
        public const string RoleCreated = "RoleCreated";
        public const string RoleUpdated = "RoleUpdated";
        public const string RoleDeleted = "RoleDeleted";
    }
}
