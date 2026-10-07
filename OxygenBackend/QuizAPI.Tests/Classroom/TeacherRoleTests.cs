using Microsoft.EntityFrameworkCore;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.Classroom;
using QuizAPI.DTOs.Invitations;
using QuizAPI.DTOs.Notification;
using QuizAPI.Exceptions;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Classroom;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Classroom;
using QuizAPI.Services.Invitations;
using QuizAPI.Services.Permissions;
using QuizAPI.Services.Roles;
using QuizAPI.Tests.Associations;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Classroom;

/// <summary>
/// The Teacher role (docs/auth/teacher-role.md): what it is not (elevated), the invite code that
/// carries it, and asking for it. Preview access for Teachers is in PreviewFormatAccessTests.
/// </summary>
public class TeacherRoleTests
{
    private const int UserRoleId = 2, AdminRoleId = 1, SuperAdminRoleId = 3, TeacherRoleId = 4;

    // ── What Teacher is ───────────────────────────────────────────────────

    [Theory]
    [InlineData("Admin", true)]
    [InlineData("superadmin", true)]
    [InlineData("Teacher", false)]
    [InlineData("User", false)]
    [InlineData(null, false)]
    public void OnlyAdminAndSuperAdmin_AreElevated(string? role, bool elevated) =>
        Assert.Equal(elevated, RoleRules.IsElevated(role));

    [Fact]
    public void Teacher_MaySeeFormatsInPreview_AndIsAnExtraRole()
    {
        Assert.Contains("Teacher", RoleRules.PreviewFormatRoles);
        Assert.True(RoleRules.IsExtraRole("Teacher"));
        Assert.False(RoleRules.IsExtraRole(" user "));
    }

    [Fact]
    public async Task AnAdmin_MayDeleteATeacher()
    {
        await using var ctx = NewContext();
        SeedRoles(ctx);
        var teacher = AddUser(ctx, "teacher", UserRoleId, TeacherRoleId);

        await UserService(ctx).DeleteUserAsync(teacher.Id, callerIsSuperAdmin: false, Guid.NewGuid());

        Assert.True(await ctx.Users.IgnoreQueryFilters().Where(u => u.Id == teacher.Id).Select(u => u.IsDeleted).SingleAsync());
    }

    // ── The invite code ──────────────────────────────────────────────────

    [Fact]
    public async Task AnAdmin_MintsTeacherCodesInBulk_WithoutTheElevatedRails()
    {
        var repository = new Mock<IInviteCodeRepository>();
        List<InviteCode>? stored = null;
        repository.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<InviteCode>>(), It.IsAny<CancellationToken>()))
                  .Callback<IEnumerable<InviteCode>, CancellationToken>((c, _) => stored = c.ToList())
                  .Returns(Task.CompletedTask);
        var roles = new Mock<IRoleRepository>();
        roles.Setup(r => r.GetByNameAsync("Teacher", It.IsAny<CancellationToken>()))
             .ReturnsAsync(new Role { Id = TeacherRoleId, Name = "Teacher" });
        var service = new InviteCodeService(repository.Object, new InviteCodeGenerator(), roles.Object, new Mock<IAuditService>().Object);

        // No expiry, no email, a batch: a school's worth of codes.
        var result = await service.GenerateAsync(new GenerateInviteCodesDTO { Count = 20, Role = "Teacher" }, callerIsSuperAdmin: false);

        Assert.Equal(20, result.Codes.Count);
        Assert.All(stored!, c => Assert.Equal(TeacherRoleId, c.GrantedRoleId));
    }

    // ── Asking for it ────────────────────────────────────────────────────

    private sealed class RequestWorld
    {
        public readonly string Db = Guid.NewGuid().ToString();
        public readonly TestClock Clock = new();
        public readonly Mock<INotificationService> Notifications = new();
        public User Asker = null!, Admin = null!;

        public RequestWorld()
        {
            using var ctx = Context();
            SeedRoles(ctx);
            Asker = AddUser(ctx, "asker", UserRoleId);
            Admin = AddUser(ctx, "admin", UserRoleId, AdminRoleId);
        }

        public ApplicationDbContext Context() =>
            new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Db).Options, new TestCurrentUserService());

        public async Task<T> Call<T>(Func<TeacherAccessService, Task<T>> call)
        {
            await using var ctx = Context();
            return await call(Service(ctx));
        }

        public async Task Do(Func<TeacherAccessService, Task> call)
        {
            await using var ctx = Context();
            await call(Service(ctx));
        }

        private TeacherAccessService Service(ApplicationDbContext ctx) =>
            new(new TeacherAccessRequestRepository(ctx), new UserRepository(ctx), UserService(ctx),
                Notifications.Object, new Mock<IAuditService>().Object, Clock);

        public string[] RolesOf(Guid id)
        {
            using var ctx = Context();
            return ctx.UserRoles.Where(ur => ur.UserId == id).Select(ur => ur.Role.Name).OrderBy(n => n).ToArray();
        }
    }

    [Fact]
    public async Task Asking_CreatesOnePendingRequest_AndASecondIsRefused()
    {
        var world = new RequestWorld();

        var mine = await world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO { Note = "  Gjimnazi Sami Frashëri  " }));

        Assert.False(mine.CanRequest);
        Assert.Equal("Pending", mine.Latest!.Status);
        Assert.Equal("Gjimnazi Sami Frashëri", mine.Latest.Note);
        await Assert.ThrowsAsync<ConflictException>(() =>
            world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO())));
    }

    [Fact]
    public async Task Approving_GrantsTheRole_KeepsTheOthers_AndTellsTheUser()
    {
        var world = new RequestWorld();
        var mine = await world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO()));

        await world.Do(s => s.ApproveAsync(mine.Latest!.Id, world.Admin.Id, callerIsSuperAdmin: false));

        Assert.Equal(new[] { "Teacher", "User" }, world.RolesOf(world.Asker.Id));
        var after = await world.Call(s => s.GetMineAsync(world.Asker.Id));
        Assert.True(after.IsTeacher);
        Assert.False(after.CanRequest);
        Assert.Equal("Approved", after.Latest!.Status);
        world.Notifications.Verify(n => n.CreateAsync(world.Asker.Id, It.IsAny<string>(), "Teacher access approved", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        // Answered once: a second answer is refused.
        await Assert.ThrowsAsync<ConflictException>(() => world.Do(s => s.DeclineAsync(mine.Latest.Id, new DeclineTeacherAccessDTO(), world.Admin.Id)));
    }

    [Fact]
    public async Task AfterADecline_TheUserWaitsThirtyDays()
    {
        var world = new RequestWorld();
        var mine = await world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO()));
        await world.Do(s => s.DeclineAsync(mine.Latest!.Id, new DeclineTeacherAccessDTO { Reason = "Please use your school email." }, world.Admin.Id));

        var declined = await world.Call(s => s.GetMineAsync(world.Asker.Id));
        Assert.False(declined.CanRequest);
        Assert.Equal(world.Clock.Now.UtcDateTime.AddDays(30), declined.CanRequestAgainAt);
        Assert.Equal("Please use your school email.", declined.Latest!.DeclineReason);
        Assert.Equal(new[] { "User" }, world.RolesOf(world.Asker.Id));

        world.Clock.Advance(TimeSpan.FromDays(29).TotalSeconds);
        await Assert.ThrowsAsync<ConflictException>(() => world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO())));

        world.Clock.Advance(TimeSpan.FromDays(1).TotalSeconds);
        var again = await world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO()));
        Assert.Equal("Pending", again.Latest!.Status);
    }

    [Fact]
    public async Task ATeacher_CannotAsk()
    {
        var world = new RequestWorld();
        using (var ctx = world.Context())
        {
            ctx.UserRoles.Add(new UserRole { UserId = world.Asker.Id, RoleId = TeacherRoleId });
            ctx.SaveChanges();
        }

        Assert.False((await world.Call(s => s.GetMineAsync(world.Asker.Id))).CanRequest);
        await Assert.ThrowsAsync<ConflictException>(() => world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO())));
    }

    [Fact]
    public async Task TheAdminList_PutsPendingFirst()
    {
        var world = new RequestWorld();
        var first = await world.Call(s => s.RequestAsync(world.Asker.Id, new RequestTeacherAccessDTO()));
        await world.Do(s => s.DeclineAsync(first.Latest!.Id, new DeclineTeacherAccessDTO(), world.Admin.Id));
        await world.Call(s => s.RequestAsync(world.Admin.Id, new RequestTeacherAccessDTO { Note = "me too" }));

        var list = await world.Call(s => s.ListAsync(null));

        Assert.Equal(new[] { "Pending", "Declined" }, list.Select(r => r.Status).ToArray());
        Assert.Equal("admin", list[0].Username);
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options, new TestCurrentUserService());

    private static void SeedRoles(ApplicationDbContext ctx)
    {
        Role R(int id, string name) => new() { Id = id, Name = name, Description = "", isActive = true, RolePermissions = new List<RolePermission>() };
        ctx.Roles.AddRange(R(UserRoleId, "User"), R(AdminRoleId, "Admin"), R(SuperAdminRoleId, "SuperAdmin"), R(TeacherRoleId, "Teacher"));
        ctx.SaveChanges();
    }

    private static User AddUser(ApplicationDbContext ctx, string name, params int[] roleIds)
    {
        var user = new User
        {
            Id = Guid.NewGuid(), Username = name, ImmutableName = name, Email = $"{name}@example.com",
            PasswordHash = "x", ProfileImageUrl = string.Empty,
            UserRoles = roleIds.Select(rid => new UserRole { RoleId = rid }).ToList(),
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static UserService UserService(ApplicationDbContext ctx) =>
        new(new UserRepository(ctx), new RoleRepository(ctx), new Mock<IAuditService>().Object, new Mock<IPermissionService>().Object);
}
