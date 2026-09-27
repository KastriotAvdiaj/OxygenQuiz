using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using QuizAPI.Controllers;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// <c>UserAnswersController</c> was fully anonymous until 2026-09-26: anyone could read a session's
/// answer key by id and delete answers by walking integer ids (docs/deployment/known-issues.md).
/// Checked by reflection, like <see cref="QuestionEndpointsAuthTests"/>, so the attributes can't be
/// dropped without a test failing.
/// </summary>
public class UserAnswersEndpointAuthTests
{
    [Fact]
    public void The_controller_requires_a_signed_in_caller()
    {
        Assert.NotNull(typeof(UserAnswersController).GetCustomAttribute<AuthorizeAttribute>());
    }

    [Fact]
    public void Deleting_an_answer_is_admin_only()
    {
        var delete = typeof(UserAnswersController).GetMethod(nameof(UserAnswersController.DeleteAnswer))!;
        var roles = delete.GetCustomAttribute<AuthorizeAttribute>()?.Roles;

        Assert.Equal("Admin,SuperAdmin", roles);
    }

    [Fact]
    public void No_action_is_open_to_anonymous_callers()
    {
        var open = typeof(UserAnswersController)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttribute<AllowAnonymousAttribute>() is not null);

        Assert.Empty(open);
    }
}
