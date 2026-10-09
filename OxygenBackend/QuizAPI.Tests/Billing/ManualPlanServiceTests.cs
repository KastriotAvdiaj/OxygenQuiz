using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.Billing;
using QuizAPI.DTOs.User;
using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Billing;
using QuizAPI.Services.Interfaces;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// An admin giving a plan away goes through the same table and rule as a bought one
/// (docs/auth/paid-plans.md, "Manual grants").
/// </summary>
public class ManualPlanServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 10, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid AdminId = Guid.NewGuid();

    private sealed class World
    {
        private readonly string _db = Guid.NewGuid().ToString();
        public string[] Roles = { "User" };
        public bool Protected;
        public readonly Mock<IUserService> UserService = new();
        public readonly Mock<IAuditService> Audit = new();
        public readonly Mock<INotificationService> Notifications = new();
        public readonly MemoryCache Cache = new(new MemoryCacheOptions());
        private readonly FakeTimeProvider _clock = new(new DateTimeOffset(Now));

        public async Task<T> Call<T>(Func<ManualPlanService, EntitlementService, Task<T>> call)
        {
            await using var ctx = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db).Options, new TestCurrentUserService());
            var users = new Mock<IUserRepository>();
            users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(() =>
                 {
                     var user = BillingTestUsers.With(UserId, Roles);
                     user.IsProtected = Protected;
                     return user;
                 });
            var subscriptions = new SubscriptionRepository(ctx);
            var entitlements = new EntitlementService(subscriptions, users.Object, Cache, _clock,
                Options.Create(new AiOptions { DefaultDailyQuota = 2 }));
            var service = new ManualPlanService(subscriptions, users.Object, UserService.Object, entitlements,
                Audit.Object, Notifications.Object, _clock);
            return await call(service, entitlements);
        }

        public Task<UserPlanAdminDTO> Set(string? plan, DateTime? endsAt = null) =>
            Call((s, _) => s.SetAsync(UserId, new SetManualPlanDTO { Plan = plan, EndsAt = endsAt }, AdminId, false));

        public Task<Entitlements> Effective() => Call((_, e) => e.GetAsync(UserId));
    }

    [Fact]
    public async Task Granting_Plus_changes_the_users_limits_at_once()
    {
        var w = new World();
        Assert.Equal(PlanTier.Free, (await w.Effective()).Plan);

        var dto = await w.Set("plus");

        Assert.Equal("Plus", dto.Plan);
        Assert.Equal("Plus", dto.ManualPlan);
        Assert.Equal(10, dto.Limits.AiDailyGenerations);
        Assert.Equal(PlanTier.Plus, (await w.Effective()).Plan);
        w.Audit.Verify(a => a.LogAsync(AuditActions.PlanGrantedManually, "User", UserId.ToString(),
            It.IsAny<object?>(), It.IsAny<object?>(), AdminId, It.IsAny<CancellationToken>()), Times.Once);
        w.Notifications.Verify(n => n.CreateAsync(UserId, "system", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Granting_Teacher_also_grants_the_Teacher_role_keeping_the_others()
    {
        var w = new World();

        await w.Set("Teacher");

        w.UserService.Verify(u => u.SetUserRolesAsync(UserId,
            It.Is<SetUserRolesDTO>(d => d.Roles.Contains("User") && d.Roles.Contains("Teacher")),
            false, AdminId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_host_who_already_has_the_role_is_not_granted_it_again()
    {
        var w = new World { Roles = new[] { "User", "Teacher" } };

        await w.Set("Teacher");

        w.UserService.Verify(u => u.SetUserRolesAsync(It.IsAny<Guid>(), It.IsAny<SetUserRolesDTO>(),
            It.IsAny<bool>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Revoking_ends_the_plan_but_never_touches_roles()
    {
        var w = new World();
        await w.Set("Teacher");
        w.UserService.Invocations.Clear();

        var dto = await w.Set(null);

        Assert.Equal("Free", dto.Plan);
        Assert.Null(dto.ManualPlan);
        Assert.Equal(PlanTier.Free, (await w.Effective()).Plan);
        w.UserService.Verify(u => u.SetUserRolesAsync(It.IsAny<Guid>(), It.IsAny<SetUserRolesDTO>(),
            It.IsAny<bool>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        w.Audit.Verify(a => a.LogAsync(AuditActions.PlanRevokedManually, "User", UserId.ToString(),
            It.IsAny<object?>(), It.IsAny<object?>(), AdminId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Regranting_reuses_the_one_manual_row()
    {
        var w = new World();
        await w.Set("Plus");
        await w.Set(null);
        await w.Set("Teacher", Now.AddDays(30));

        var effective = await w.Effective();
        Assert.Equal(PlanTier.Teacher, effective.Plan);
        Assert.Equal(Now.AddDays(30), effective.PlanEndsAt);
    }

    [Fact]
    public async Task Revoking_when_nothing_was_granted_is_a_no_op()
    {
        var w = new World();

        var dto = await w.Set(null);

        Assert.Equal("Free", dto.Plan);
        w.Audit.Verify(a => a.LogAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task A_system_account_cannot_have_a_plan()
    {
        var w = new World { Protected = true };

        await Assert.ThrowsAsync<ForbiddenException>(() => w.Set("Plus"));
    }

    [Theory]
    [InlineData("Free")]
    [InlineData("Gold")]
    public async Task Only_a_paid_plan_can_be_granted(string plan)
    {
        await Assert.ThrowsAsync<AppValidationException>(() => new World().Set(plan));
    }

    [Fact]
    public async Task An_end_date_in_the_past_is_refused()
    {
        await Assert.ThrowsAsync<AppValidationException>(() => new World().Set("Plus", Now.AddDays(-1)));
    }
}
