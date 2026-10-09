using QuizAPI.Models.Billing;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// What a user may do *how much of*, right now. A plan answers "how much"; a role answers
    /// "who may" — hosting a board is still the Teacher role's (docs/adr/0026). Every limit is
    /// read from here at the one place it is enforced, so a perk is a lookup, not a design.
    /// </summary>
    /// <param name="Plan">The effective plan, after lapsed and canceled subscriptions are discounted.</param>
    /// <param name="IsStaff">Admin or SuperAdmin. Staff are not on a plan; they get the top limits and no AI daily count.</param>
    /// <param name="AiDailyGenerations">AI generations per UTC day, or null for no daily count. Budget caps still apply.</param>
    /// <param name="MaxOwnedQuizzes">Non-deleted quizzes a user may own, or null for unlimited. Only creating more is refused.</param>
    /// <param name="MaxLobbyPlayers">The largest multiplayer lobby this user may open.</param>
    /// <param name="MaxClasses">Classes a host may keep, or null for unlimited.</param>
    /// <param name="PlanEndsAt">When the effective paid plan stops (renewal or end of a canceled period), or null.</param>
    /// <param name="CancelAtPeriodEnd">The plan will not renew.</param>
    public sealed record Entitlements(
        PlanTier Plan,
        bool IsStaff,
        int? AiDailyGenerations,
        int? MaxOwnedQuizzes,
        int MaxLobbyPlayers,
        int? MaxClasses,
        DateTime? PlanEndsAt = null,
        bool CancelAtPeriodEnd = false);
}
