using QuizAPI.Filtering;
using QuizAPI.Models.Quiz;
using static QuizAPI.Filtering.FilterOperator;

namespace QuizAPI.Controllers.Quizzes
{
    /// <summary>
    /// How a history row reads to the player. Derived, not stored: a session with an
    /// <see cref="QuizSession.AbandonmentReason"/> is abandoned whatever else it says, otherwise
    /// <see cref="QuizSession.IsCompleted"/> decides. Same precedence as the history card's badge.
    /// </summary>
    public enum SessionHistoryStatus
    {
        InProgress = 0,
        Completed = 1,
        Abandoned = 2,
    }

    /// <summary>
    /// The whitelist of fields clients may filter / search / sort a user's play history by
    /// (<c>GET /api/quizsessions/user/{userId}</c>). The quiz facets use the same names as
    /// <see cref="QuizFilterFields"/> — <c>categoryId</c>, <c>difficultyId</c>, <c>languageId</c> —
    /// so the frontend's quiz facet panel serializes to this endpoint unchanged.
    /// See docs/quiz/filtering.md and docs/quiz/user-stats-history.md.
    /// </summary>
    public static class QuizSessionFilterFields
    {
        public static readonly FilterFieldSet<QuizSession> Fields = new FilterFieldSet<QuizSession>()
            .Field("quizTitle",    s => s.Quiz.Title,        new[] { Contains, StartsWith, Eq }, searchable: true, sortable: true)
            .Field("quizId",       s => s.QuizId,            new[] { Eq, In })
            .Field("categoryId",   s => s.Quiz.CategoryId,   new[] { Eq, In })
            .Field("difficultyId", s => s.Quiz.DifficultyId, new[] { Eq, In })
            .Field("languageId",   s => s.Quiz.LanguageId,   new[] { Eq, In })
            // Translates to a SQL CASE, so `status:in:Completed,Abandoned` runs in the database.
            .Field("status",
                s => s.AbandonmentReason != null
                    ? SessionHistoryStatus.Abandoned
                    : s.IsCompleted ? SessionHistoryStatus.Completed : SessionHistoryStatus.InProgress,
                new[] { Eq, In })
            .Field("totalScore",   s => s.TotalScore,        new[] { Gte, Lte, Between }, sortable: true)
            // Share of the session's questions answered correctly, 0–1 — the history's headline
            // "score /100" (the results page's Final Score), so "highest score" sorts by what the
            // player sees rather than by raw points. Both counts are the same expressions as
            // QuizSessionMappers.ProjectSummary (pinned-version question count, Correct answers);
            // keep them in step. Sort-only: no operators.
            .Field("accuracy",
                s => s.Quiz.QuizQuestions.Count(qq =>
                        qq.CreatedInVersion <= s.QuizVersion
                        && (qq.RemovedInVersion == null || qq.RemovedInVersion > s.QuizVersion)) == 0
                    ? 0.0
                    : (double)s.UserAnswers.Count(ua => ua.Status == AnswerStatus.Correct)
                        / s.Quiz.QuizQuestions.Count(qq =>
                            qq.CreatedInVersion <= s.QuizVersion
                            && (qq.RemovedInVersion == null || qq.RemovedInVersion > s.QuizVersion)),
                System.Array.Empty<FilterOperator>(),
                sortable: true)
            .Field("startTime",    s => s.StartTime,         new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true, defaultSort: true);
    }
}
