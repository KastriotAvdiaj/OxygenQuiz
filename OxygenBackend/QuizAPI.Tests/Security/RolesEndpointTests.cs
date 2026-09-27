using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using QuizAPI.Controllers.Roles;
using QuizAPI.Data;
using QuizAPI.DTOs.User;
using QuizAPI.Models;
using QuizAPI.Services.Audit;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// <c>GET /api/Roles</c> is readable by Admins (the role picker), so it returns a small DTO —
/// id, name, active flag, description — not the <c>Role</c> entity with its concurrency stamp and
/// navigation collections (docs/auth/user-role-management.md).
/// </summary>
public class RolesEndpointTests
{
    private static ApplicationDbContext Db()
    {
        var ctx = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
            new TestCurrentUserService());
        ctx.Roles.Add(new Role { Id = 1, Name = "Admin", isActive = true, Description = "Runs the place", ConcurrencyStamp = Guid.NewGuid() });
        ctx.Roles.Add(new Role { Id = 2, Name = "User", isActive = true, Description = "Plays quizzes", ConcurrencyStamp = Guid.NewGuid() });
        ctx.SaveChanges();
        return ctx;
    }

    private static RolesController Controller(ApplicationDbContext ctx) => new(ctx, new Mock<IAuditService>().Object);

    [Fact]
    public async Task The_list_is_the_role_picker_fields_only()
    {
        var result = await Controller(Db()).GetRoles();

        var roles = Assert.IsAssignableFrom<IEnumerable<RoleDTO>>(Assert.IsType<OkObjectResult>(result.Result).Value).ToList();
        Assert.Equal(new[] { (1, "Admin"), (2, "User") }, roles.OrderBy(r => r.Id).Select(r => (r.Id, r.Name)));

        var json = JsonSerializer.Serialize(roles, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.DoesNotContain("concurrencyStamp", json);
        Assert.DoesNotContain("userRoles", json);
        Assert.DoesNotContain("rolePermissions", json);
        Assert.Contains("\"isActive\":true", json);
        Assert.Contains("\"description\":\"Runs the place\"", json);
    }

    [Fact]
    public async Task One_role_is_the_same_shape_and_a_missing_one_is_404()
    {
        var controller = Controller(Db());

        var role = Assert.IsType<RoleDTO>(Assert.IsType<OkObjectResult>((await controller.GetRole(2)).Result).Value);
        Assert.Equal("User", role.Name);
        Assert.IsType<NotFoundResult>((await controller.GetRole(99)).Result);
    }
}
