using Microsoft.EntityFrameworkCore;
using Moq;
using QuizAPI.Data;
using QuizAPI.Exceptions;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Repositories;
using QuizAPI.Services;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Permissions;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Users;

/// <summary>
/// Tests for administrative deletion — the three refusals added in ADR 0011.
///
/// Before that, the only check on this path was "is the caller an Admin?", which let any Admin
/// soft-delete every SuperAdmin. That is not recoverable in-app: there is no code path that sets
/// IsDeleted back to false, and the global !IsDeleted query filter hides the row from everything
/// that could find it. These tests are the thing standing between that and a future refactor.
/// </summary>
public class UserServiceDeleteTests
{
    private const int UserRoleId = 1;
    private const int AdminRoleId = 2;
    private const int SuperAdminRoleId = 3;

    private readonly Mock<IAuditService> _audit = new();
    private readonly Mock<IPermissionService> _permissions = new();

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    private static void SeedRoles(ApplicationDbContext ctx)
    {
        ctx.Roles.AddRange(
            new Role { Id = UserRoleId, Name = "User", Description = "", isActive = true, RolePermissions = new List<RolePermission>() },
            new Role { Id = AdminRoleId, Name = "Admin", Description = "", isActive = true, RolePermissions = new List<RolePermission>() },
            new Role { Id = SuperAdminRoleId, Name = "SuperAdmin", Description = "", isActive = true, RolePermissions = new List<RolePermission>() });
        ctx.SaveChanges();
    }

    private static User AddUser(ApplicationDbContext ctx, string name, bool isProtected, params int[] roleIds)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = name,
            ImmutableName = name.ToLowerInvariant(),
            Email = $"{name}@example.com",
            PasswordHash = "x",
            ProfileImageUrl = string.Empty,
            IsProtected = isProtected,
            UserRoles = roleIds.Select(rid => new UserRole { RoleId = rid }).ToList(),
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private UserService SutFor(ApplicationDbContext ctx) =>
        new(new UserRepository(ctx), new RoleRepository(ctx), _audit.Object, _permissions.Object);

    /// <summary>
    /// Reads the flag past the global query filter — a soft-deleted row is invisible to an ordinary
    /// query, which is the whole reason this deletion is so hard to undo.
    /// </summary>
    private static async Task<bool> IsDeleted(ApplicationDbContext ctx, Guid id) =>
        await ctx.Users.IgnoreQueryFilters().Where(u => u.Id == id).Select(u => u.IsDeleted).SingleAsync();

    [Fact]
    public async Task AdminDeletesPlainUser_Succeeds()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "player", isProtected: false, UserRoleId);

        await SutFor(ctx).DeleteUserAsync(target.Id, callerIsSuperAdmin: false, Guid.NewGuid());

        Assert.True(await IsDeleted(ctx, target.Id));
    }

    [Fact]
    public async Task AdminDeletesSuperAdmin_ThrowsForbidden()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "sa", isProtected: false, SuperAdminRoleId);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            SutFor(ctx).DeleteUserAsync(target.Id, callerIsSuperAdmin: false, Guid.NewGuid()));

        Assert.False(await IsDeleted(ctx, target.Id));
    }

    [Fact]
    public async Task AdminDeletesAnotherAdmin_ThrowsForbidden()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "otheradmin", isProtected: false, AdminRoleId);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            SutFor(ctx).DeleteUserAsync(target.Id, callerIsSuperAdmin: false, Guid.NewGuid()));

        Assert.False(await IsDeleted(ctx, target.Id));
    }

    [Fact]
    public async Task SuperAdminDeletesAdmin_Succeeds()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "admin2", isProtected: false, AdminRoleId);

        await SutFor(ctx).DeleteUserAsync(target.Id, callerIsSuperAdmin: true, Guid.NewGuid());

        Assert.True(await IsDeleted(ctx, target.Id));
    }

    [Fact]
    public async Task ProtectedAccount_CannotBeDeleted_EvenBySuperAdmin()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var root = AddUser(ctx, "root", isProtected: true, SuperAdminRoleId);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            SutFor(ctx).DeleteUserAsync(root.Id, callerIsSuperAdmin: true, Guid.NewGuid()));

        Assert.False(await IsDeleted(ctx, root.Id));
    }

    /// <summary>
    /// The guest-play placeholder has no roles at all, so it would sail past the elevated-role
    /// check. Protection is what stops it, and this is the test that says so.
    /// </summary>
    [Fact]
    public async Task ProtectedAccountWithNoRoles_CannotBeDeleted()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var guest = AddUser(ctx, "guest", isProtected: true);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            SutFor(ctx).DeleteUserAsync(guest.Id, callerIsSuperAdmin: true, Guid.NewGuid()));

        Assert.False(await IsDeleted(ctx, guest.Id));
    }

    /// <summary>
    /// Self-deletion is refused here even for a SuperAdmin: this endpoint is the administrative
    /// tool, and leaving is account closure — a separate self-service flow with its own grace
    /// period (ADR 0012).
    /// </summary>
    [Fact]
    public async Task DeletingYourOwnAccount_ThrowsForbidden()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var caller = AddUser(ctx, "me", isProtected: false, SuperAdminRoleId);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            SutFor(ctx).DeleteUserAsync(caller.Id, callerIsSuperAdmin: true, caller.Id));

        Assert.False(await IsDeleted(ctx, caller.Id));
    }

    [Fact]
    public async Task DeletingUnknownUser_ThrowsNotFound()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            SutFor(ctx).DeleteUserAsync(Guid.NewGuid(), callerIsSuperAdmin: true, Guid.NewGuid()));
    }
}
