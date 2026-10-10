using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Services.Interfaces;
using QuizAPI.DTOs.Billing;
using QuizAPI.DTOs.User;
using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Roles;

namespace QuizAPI.Services.Billing
{
    public interface IManualPlanService
    {
        Task<UserPlanAdminDTO> GetAsync(Guid userId, CancellationToken ct = default);

        /// <summary>Grants, changes or revokes (<c>Plan = null</c>) a user's manual plan.</summary>
        Task<UserPlanAdminDTO> SetAsync(Guid userId, SetManualPlanDTO dto, Guid callerId, bool callerIsSuperAdmin, CancellationToken ct = default);
    }

    /// <summary>
    /// An admin giving a plan away — to a teacher worth having on board, a pilot school, or a test
    /// account in production (docs/auth/paid-plans.md, "Manual grants"). It goes through the same
    /// <see cref="UserSubscription"/> table and entitlement rule as a bought plan, so a granted plan
    /// and a paid one can't drift apart in what they unlock.
    ///
    /// <para>A user has at most one manual row, reused on every regrant. Revoking ends it now
    /// rather than deleting it, so the history of who was given what stays in the table as well as
    /// the audit log.</para>
    /// </summary>
    public sealed class ManualPlanService : IManualPlanService
    {
        public const int MaxNoteLength = 500;

        private readonly ISubscriptionRepository _subscriptions;
        private readonly IUserRepository _users;
        private readonly IUserService _userService;
        private readonly IEntitlementService _entitlements;
        private readonly IAuditService _audit;
        private readonly INotificationService _notifications;
        private readonly TimeProvider _clock;

        public ManualPlanService(
            ISubscriptionRepository subscriptions,
            IUserRepository users,
            IUserService userService,
            IEntitlementService entitlements,
            IAuditService audit,
            INotificationService notifications,
            TimeProvider clock)
        {
            _subscriptions = subscriptions;
            _users = users;
            _userService = userService;
            _entitlements = entitlements;
            _audit = audit;
            _notifications = notifications;
            _clock = clock;
        }

        private DateTime Now => _clock.GetUtcNow().UtcDateTime;

        public async Task<UserPlanAdminDTO> GetAsync(Guid userId, CancellationToken ct = default)
        {
            _ = await _users.GetByIdAsync(userId, ct: ct) ?? throw new NotFoundException("No such user.");
            var entitlements = await _entitlements.GetAsync(userId, ct);
            var manual = await _subscriptions.GetManualAsync(userId, ct: ct);
            var manualCounts = manual is not null && EntitlementService.Counts(manual, Now);

            var dto = new UserPlanAdminDTO
            {
                UserId = userId,
                ManualPlan = manualCounts ? manual!.Plan.ToString() : null,
                ManualEndsAt = manualCounts ? manual!.CurrentPeriodEnd : null,
                ManualNote = manualCounts ? manual!.Note : null,
            };
            PlanMapping.Fill(dto, entitlements);
            return dto;
        }

        public async Task<UserPlanAdminDTO> SetAsync(
            Guid userId, SetManualPlanDTO dto, Guid callerId, bool callerIsSuperAdmin, CancellationToken ct = default)
        {
            var user = await _users.GetByIdAsync(userId, ct: ct) ?? throw new NotFoundException("No such user.");
            // System accounts (ADR 0011) are not customers; a plan on the shared guest account
            // would hand every anonymous visitor its limits.
            if (user.IsProtected)
                throw new ForbiddenException("This is a system account. It can't have a plan.");

            var plan = ParsePlan(dto.Plan);
            var note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
            if (note?.Length > MaxNoteLength)
                throw new AppValidationException($"The note can be at most {MaxNoteLength} characters.");
            if (plan is not null && dto.EndsAt is DateTime end && end.ToUniversalTime() <= Now)
                throw new AppValidationException("The end date must be in the future.");

            var row = await _subscriptions.GetManualAsync(userId, tracked: true, ct);

            if (plan is null)
            {
                if (row is null || !EntitlementService.Counts(row, Now))
                    return await GetAsync(userId, ct); // nothing to revoke — idempotent

                var revoked = row.Plan;
                row.Status = SubscriptionStatus.Canceled;
                row.CurrentPeriodEnd = Now;
                row.UpdatedAt = Now;
                await _subscriptions.SaveChangesAsync(ct);
                _entitlements.Evict(userId);

                await _audit.LogAsync(AuditActions.PlanRevokedManually, entity: "User", entityId: userId.ToString(),
                    oldValue: new { Plan = revoked.ToString() }, userId: callerId, ct: ct);
                return await GetAsync(userId, ct);
            }

            var old = row is not null && EntitlementService.Counts(row, Now) ? row.Plan.ToString() : null;
            if (row is null)
            {
                row = new UserSubscription
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Provider = SubscriptionProvider.Manual,
                    Interval = BillingInterval.None,
                    CreatedAt = Now,
                };
                await _subscriptions.AddAsync(row, ct);
            }

            row.Plan = plan.Value;
            row.Status = SubscriptionStatus.Active;
            row.CurrentPeriodEnd = dto.EndsAt?.ToUniversalTime();
            row.CancelAtPeriodEnd = false;
            row.GrantedByUserId = callerId;
            row.Note = note;
            row.UpdatedAt = Now;
            await _subscriptions.SaveChangesAsync(ct);
            _entitlements.Evict(userId);

            // A Teacher plan without the Teacher role would sell Classes the user can't open. The
            // grant is one-way on purpose: revoking or lapsing the plan never removes the role, so
            // permissions don't change because a plan ended (docs/adr/0026).
            if (plan == PlanTier.Teacher && !RoleRules.CanHost(user.UserRoles.Select(ur => ur.Role?.Name)))
            {
                var roles = user.UserRoles.Select(ur => ur.Role.Name).Append(RoleRules.Teacher).ToList();
                await _userService.SetUserRolesAsync(userId, new SetUserRolesDTO { Roles = roles }, callerIsSuperAdmin, callerId, ct);
            }

            await _audit.LogAsync(AuditActions.PlanGrantedManually, entity: "User", entityId: userId.ToString(),
                oldValue: old is null ? null : new { Plan = old },
                newValue: new { Plan = plan.Value.ToString(), EndsAt = row.CurrentPeriodEnd, Note = note },
                userId: callerId, ct: ct);

            if (old != plan.Value.ToString())
            {
                await _notifications.CreateAsync(userId, "system", $"You're on the {plan.Value} plan",
                    plan == PlanTier.Teacher
                        ? "Your account now has the Teacher plan: more AI quizzes, bigger lobbies and unlimited Classes. Sign in again if you don't see the Classroom section yet."
                        : "Your account now has the Plus plan: more AI quizzes a day and bigger lobbies.",
                    ct);
            }

            return await GetAsync(userId, ct);
        }

        private static PlanTier? ParsePlan(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            if (Enum.TryParse<PlanTier>(value.Trim(), ignoreCase: true, out var tier) && tier != PlanTier.Free)
                return tier;
            throw new AppValidationException("Plan must be Plus, Teacher, or empty to revoke.");
        }
    }

    /// <summary>Entitlements → DTOs, shared by the controller and the admin view.</summary>
    public static class PlanMapping
    {
        public static PlanLimitsDTO Limits(Entitlements e) => new()
        {
            AiDailyGenerations = e.AiDailyGenerations,
            MaxOwnedQuizzes = e.MaxOwnedQuizzes,
            MaxLobbyPlayers = e.MaxLobbyPlayers,
            MaxClasses = e.MaxClasses,
        };

        public static T Fill<T>(T dto, Entitlements e) where T : MyPlanDTO
        {
            dto.Plan = e.Plan.ToString();
            dto.IsStaff = e.IsStaff;
            dto.Limits = Limits(e);
            dto.PlanEndsAt = e.PlanEndsAt;
            dto.CancelAtPeriodEnd = e.CancelAtPeriodEnd;
            dto.Provider = e.Provider;
            return dto;
        }
    }
}
