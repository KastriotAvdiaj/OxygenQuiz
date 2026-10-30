using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Moq;
using QuizAPI.Controllers.Moderation;
using QuizAPI.DTOs.Moderation;
using QuizAPI.Exceptions;
using QuizAPI.Services.Moderation;
using QuizAPI.Services.Permissions;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// Reporting needs an account; moderating needs <c>moderation:manage</c> (picking, <c>quiz:pick</c>).
/// Every action is driven through the controller with a caller who lacks the permission, so a new
/// action that forgets the check fails here. docs/media/moderation.md.
/// </summary>
public class ModerationEndpointTests
{
    [Fact]
    public void Both_controllers_need_a_signed_in_caller()
    {
        foreach (var t in new[] { typeof(ContentReportsController), typeof(ModerationController) })
        {
            Assert.NotNull(t.GetCustomAttribute<AuthorizeAttribute>());
            Assert.DoesNotContain(t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly),
                m => m.GetCustomAttribute<AllowAnonymousAttribute>() is not null);
        }
    }

    [Fact]
    public async Task Every_moderation_action_is_refused_without_the_permission()
    {
        var service = new Mock<IModerationService>(MockBehavior.Strict); // any call that slips through throws
        var permissions = new Mock<IPermissionService>();
        permissions.Setup(p => p.HasPermissionAsync(It.IsAny<Guid>(), It.IsAny<string>())).ReturnsAsync(false);
        var c = new ModerationController(service.Object, permissions.Object, new TestCurrentUserService { IsAdmin = false });

        var calls = new Func<Task>[]
        {
            () => c.Lane("Urgent"),
            () => c.Counts(default),
            () => c.Resolve(new ResolveReportsCM { QuestionId = 1, Outcome = "Upheld" }, default),
            () => c.HideMedia(1, default),
            () => c.ShowMedia(1, default),
            () => c.Hold(1, default),
            () => c.Release(1, default),
            () => c.RemoveMedia(Guid.NewGuid(), default),
            () => c.Pick(1, default),
            () => c.Unpick(1, default),
        };
        foreach (var call in calls) await Assert.ThrowsAsync<ForbiddenException>(call);

        // The reflection side: every action on the controller is in the list above.
        var actions = typeof(ModerationController).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Count(m => m.GetCustomAttributes().Any(a => a is Microsoft.AspNetCore.Mvc.Routing.HttpMethodAttribute));
        Assert.Equal(calls.Length, actions);
    }
}
