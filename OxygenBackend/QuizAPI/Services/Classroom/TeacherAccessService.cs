using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Services.Interfaces;
using QuizAPI.DTOs.Classroom;
using QuizAPI.DTOs.User;
using QuizAPI.Exceptions;
using QuizAPI.Models.Classroom;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Roles;

namespace QuizAPI.Services.Classroom
{
    public interface ITeacherAccessService
    {
        Task<MyTeacherAccessDTO> GetMineAsync(Guid userId, CancellationToken ct = default);
        Task<MyTeacherAccessDTO> RequestAsync(Guid userId, RequestTeacherAccessDTO dto, CancellationToken ct = default);
        Task<IReadOnlyList<TeacherAccessRequestDTO>> ListAsync(TeacherAccessRequestStatus? status, CancellationToken ct = default);
        Task ApproveAsync(int id, Guid callerId, bool callerIsSuperAdmin, CancellationToken ct = default);
        Task DeclineAsync(int id, DeclineTeacherAccessDTO dto, Guid callerId, CancellationToken ct = default);
    }

    /// <summary>
    /// Asking for the Teacher role, and an Admin answering (docs/auth/teacher-role.md §2).
    ///
    /// <para>Approving grants the role through <see cref="IUserService.SetUserRolesAsync"/> — the same
    /// path as the Users table — so the escalation gate, the permission-cache eviction and the
    /// audit entry are the ones every other role change gets. This service only owns the request:
    /// one open at a time, and a wait after a decline.</para>
    /// </summary>
    public class TeacherAccessService : ITeacherAccessService
    {
        /// <summary>How long after a decline before the user may ask again.</summary>
        public static readonly TimeSpan RetryAfterDecline = TimeSpan.FromDays(30);

        private readonly ITeacherAccessRequestRepository _requests;
        private readonly IUserRepository _users;
        private readonly IUserService _userService;
        private readonly INotificationService _notifications;
        private readonly IAuditService _audit;
        private readonly TimeProvider _clock;

        public TeacherAccessService(
            ITeacherAccessRequestRepository requests, IUserRepository users, IUserService userService,
            INotificationService notifications, IAuditService audit, TimeProvider clock)
        {
            _requests = requests;
            _users = users;
            _userService = userService;
            _notifications = notifications;
            _audit = audit;
            _clock = clock;
        }

        private DateTime Now => _clock.GetUtcNow().UtcDateTime;

        public async Task<MyTeacherAccessDTO> GetMineAsync(Guid userId, CancellationToken ct = default)
        {
            var user = await _users.GetByIdAsync(userId, ct: ct)
                ?? throw new NotFoundException("User not found.");
            var isTeacher = HasTeacherRole(user);
            var latest = await _requests.GetLatestForUserAsync(userId, ct);

            DateTime? againAt = latest is { Status: TeacherAccessRequestStatus.Declined, DecidedAt: { } decided }
                ? decided + RetryAfterDecline
                : null;
            if (againAt <= Now) againAt = null;

            return new MyTeacherAccessDTO
            {
                IsTeacher = isTeacher,
                Latest = latest is null ? null : ToDto(latest, user.Username, user.Email),
                CanRequestAgainAt = againAt,
                CanRequest = !isTeacher && latest?.Status != TeacherAccessRequestStatus.Pending && againAt is null,
            };
        }

        public async Task<MyTeacherAccessDTO> RequestAsync(Guid userId, RequestTeacherAccessDTO dto, CancellationToken ct = default)
        {
            var mine = await GetMineAsync(userId, ct);
            if (mine.IsTeacher)
                throw new ConflictException("You already have teacher access.");
            if (mine.Latest?.Status == nameof(TeacherAccessRequestStatus.Pending))
                throw new ConflictException("You already have a request waiting for an answer.");
            if (mine.CanRequestAgainAt is { } at)
                throw new ConflictException($"You can ask again from {at:yyyy-MM-dd}.");

            var note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
            if (note?.Length > TeacherAccessRequest.MaxNoteLength)
                throw new AppValidationException($"The note can be at most {TeacherAccessRequest.MaxNoteLength} characters.");

            var request = new TeacherAccessRequest
            {
                UserId = userId,
                Note = note,
                Status = TeacherAccessRequestStatus.Pending,
                CreatedAt = Now,
            };
            await _requests.AddAsync(request, ct);
            await _requests.SaveChangesAsync(ct);

            await _audit.LogAsync(AuditActions.TeacherAccessRequested, entity: "TeacherAccessRequest",
                entityId: request.Id.ToString(), newValue: new { request.Note }, userId: userId, ct: ct);

            return await GetMineAsync(userId, ct);
        }

        public async Task<IReadOnlyList<TeacherAccessRequestDTO>> ListAsync(TeacherAccessRequestStatus? status, CancellationToken ct = default)
        {
            var rows = await _requests.ListAsync(status, ct);
            return rows.Select(r => ToDto(r, r.User.Username, r.User.Email)).ToList();
        }

        public async Task ApproveAsync(int id, Guid callerId, bool callerIsSuperAdmin, CancellationToken ct = default)
        {
            var request = await PendingAsync(id, ct);

            var user = await _users.GetByIdAsync(request.UserId, ct: ct)
                ?? throw new NotFoundException("The user who asked no longer exists.");
            if (!HasTeacherRole(user))
            {
                var roles = user.UserRoles.Select(ur => ur.Role.Name).Append(RoleRules.Teacher).ToList();
                await _userService.SetUserRolesAsync(request.UserId, new SetUserRolesDTO { Roles = roles }, callerIsSuperAdmin, callerId, ct);
            }

            request.Status = TeacherAccessRequestStatus.Approved;
            request.DecidedByUserId = callerId;
            request.DecidedAt = Now;
            await _requests.SaveChangesAsync(ct);

            await _audit.LogAsync(AuditActions.TeacherAccessApproved, entity: "TeacherAccessRequest",
                entityId: id.ToString(), newValue: new { request.UserId }, userId: callerId, ct: ct);
            await _notifications.CreateAsync(request.UserId, "system", "Teacher access approved",
                "You can now host boards for your class and keep Classes. Sign in again if you don't see the Classroom section yet.", ct);
        }

        public async Task DeclineAsync(int id, DeclineTeacherAccessDTO dto, Guid callerId, CancellationToken ct = default)
        {
            var request = await PendingAsync(id, ct);
            var reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
            if (reason?.Length > TeacherAccessRequest.MaxReasonLength)
                throw new AppValidationException($"The reason can be at most {TeacherAccessRequest.MaxReasonLength} characters.");

            request.Status = TeacherAccessRequestStatus.Declined;
            request.DecidedByUserId = callerId;
            request.DecidedAt = Now;
            request.DeclineReason = reason;
            await _requests.SaveChangesAsync(ct);

            await _audit.LogAsync(AuditActions.TeacherAccessDeclined, entity: "TeacherAccessRequest",
                entityId: id.ToString(), newValue: new { request.UserId, reason }, userId: callerId, ct: ct);
            var again = (request.DecidedAt.Value + RetryAfterDecline).ToString("yyyy-MM-dd");
            await _notifications.CreateAsync(request.UserId, "system", "Teacher access declined",
                (reason is null ? "Your request for teacher access was declined." : $"Your request for teacher access was declined: {reason}")
                + $" You can ask again from {again}.", ct);
        }

        private async Task<TeacherAccessRequest> PendingAsync(int id, CancellationToken ct)
        {
            var request = await _requests.GetByIdAsync(id, tracked: true, ct)
                ?? throw new NotFoundException("No such request.");
            if (request.Status != TeacherAccessRequestStatus.Pending)
                throw new ConflictException("This request has already been answered.");
            return request;
        }

        private static bool HasTeacherRole(Models.User user) =>
            user.UserRoles.Any(ur => RoleRules.Teacher.Equals(ur.Role?.Name, StringComparison.OrdinalIgnoreCase));

        private static TeacherAccessRequestDTO ToDto(TeacherAccessRequest r, string username, string email) => new()
        {
            Id = r.Id,
            UserId = r.UserId,
            Username = username,
            Email = email,
            Note = r.Note,
            Status = r.Status.ToString(),
            CreatedAt = r.CreatedAt,
            DecidedAt = r.DecidedAt,
            DeclineReason = r.DeclineReason,
        };
    }
}
