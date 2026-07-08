using Microsoft.EntityFrameworkCore;
using Moq;
using QuizAPI.Data;
using QuizAPI.DTOs.User;
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
/// Tests for the admin "change user role" action, focused on the privilege-escalation rules:
/// only a SuperAdmin may grant or remove the SuperAdmin role, and the last SuperAdmin can't be
/// demoted. Uses a real repository over an in-memory context so the lockout count query runs for real.
/// </summary>
public class UserServiceRoleTests
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

    private static User AddUser(ApplicationDbContext ctx, string name, params int[] roleIds)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = name,
            ImmutableName = name.ToLowerInvariant(),
            Email = $"{name}@example.com",
            PasswordHash = "x",
            ProfileImageUrl = string.Empty,
            UserRoles = roleIds.Select(rid => new UserRole { RoleId = rid }).ToList(),
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private UserService SutFor(ApplicationDbContext ctx) =>
        new(new UserRepository(ctx), new RoleRepository(ctx), _audit.Object, _permissions.Object);

    private static SetUserRolesDTO Roles(params string[] roles) => new() { Roles = roles };

    private async Task<IReadOnlyList<string>> RoleNamesOf(ApplicationDbContext ctx, Guid userId) =>
        await ctx.UserRoles.Where(ur => ur.UserId == userId)
            .Select(ur => ur.Role.Name).ToListAsync();

    [Fact]
    public async Task AdminGrantsAdminToUser_Succeeds_AndInvalidatesCache()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "bob", UserRoleId);
        var caller = Guid.NewGuid();

        await SutFor(ctx).SetUserRolesAsync(target.Id, Roles("Admin"), callerIsSuperAdmin: false, caller);

        Assert.Equal(new[] { "Admin" }, await RoleNamesOf(ctx, target.Id));
        _permissions.Verify(p => p.InvalidateCache(target.Id), Times.Once);
        _audit.Verify(a => a.LogAsync(AuditActions.UserRolesChanged,
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<object>(),
            It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AdminTriesToGrantSuperAdmin_ThrowsForbidden_AndDoesNotChange()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "bob", UserRoleId);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            SutFor(ctx).SetUserRolesAsync(target.Id, Roles("SuperAdmin"), callerIsSuperAdmin: false, Guid.NewGuid()));

        Assert.Equal(new[] { "User" }, await RoleNamesOf(ctx, target.Id));
        _permissions.Verify(p => p.InvalidateCache(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task AdminTriesToRemoveSuperAdmin_ThrowsForbidden()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        AddUser(ctx, "othersa", SuperAdminRoleId); // ensure not the last SA
        var target = AddUser(ctx, "sa", SuperAdminRoleId);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            SutFor(ctx).SetUserRolesAsync(target.Id, Roles("User"), callerIsSuperAdmin: false, Guid.NewGuid()));
    }

    [Fact]
    public async Task SuperAdminGrantsSuperAdmin_Succeeds()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "bob", UserRoleId);

        await SutFor(ctx).SetUserRolesAsync(target.Id, Roles("SuperAdmin"), callerIsSuperAdmin: true, Guid.NewGuid());

        Assert.Equal(new[] { "SuperAdmin" }, await RoleNamesOf(ctx, target.Id));
    }

    [Fact]
    public async Task RemovingLastSuperAdmin_ThrowsValidation()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var onlySa = AddUser(ctx, "sa", SuperAdminRoleId);

        var ex = await Assert.ThrowsAsync<AppValidationException>(() =>
            SutFor(ctx).SetUserRolesAsync(onlySa.Id, Roles("User"), callerIsSuperAdmin: true, Guid.NewGuid()));
        Assert.Contains("last SuperAdmin", ex.Message);

        Assert.Equal(new[] { "SuperAdmin" }, await RoleNamesOf(ctx, onlySa.Id));
    }

    [Fact]
    public async Task DemotingSuperAdmin_WhenAnotherExists_Succeeds()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        AddUser(ctx, "keeper", SuperAdminRoleId);
        var target = AddUser(ctx, "sa", SuperAdminRoleId);

        await SutFor(ctx).SetUserRolesAsync(target.Id, Roles("User"), callerIsSuperAdmin: true, Guid.NewGuid());

        Assert.Equal(new[] { "User" }, await RoleNamesOf(ctx, target.Id));
    }

    [Fact]
    public async Task NoChange_IsNoOp_NoAuditNoCacheBust()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "bob", AdminRoleId);

        await SutFor(ctx).SetUserRolesAsync(target.Id, Roles("Admin"), callerIsSuperAdmin: false, Guid.NewGuid());

        _audit.Verify(a => a.LogAsync(It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<object>(),
            It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
        _permissions.Verify(p => p.InvalidateCache(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UnknownRole_ThrowsConflict()
    {
        using var ctx = NewContext();
        SeedRoles(ctx);
        var target = AddUser(ctx, "bob", UserRoleId);

        await Assert.ThrowsAsync<ConflictException>(() =>
            SutFor(ctx).SetUserRolesAsync(target.Id, Roles("Wizard"), callerIsSuperAdmin: true, Guid.NewGuid()));
    }
}
