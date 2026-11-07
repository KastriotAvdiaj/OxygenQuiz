using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Controllers.Quizzes;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Roles;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// Who may use AI generation, and how often (docs/quiz/ai-quiz-generation-flow.md §4a): Admins,
/// SuperAdmins and Teachers only since the public launch; SuperAdmins uncapped, the other two at
/// <c>Ai:DefaultDailyQuota</c>. Two locks — the endpoints by role, and a daily limit of zero for
/// anyone else — and each is checked on its own.
/// </summary>
public class AiAccessTests
{
    // ── The endpoints ───────────────────────────────────────────────────────────────────────

    private static IEnumerable<MethodInfo> Actions(Type controller) =>
        controller
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes<HttpMethodAttribute>().Any());

    [Fact]
    public void Every_ai_endpoint_is_for_admins_superadmins_and_teachers_only()
    {
        var gate = typeof(AiQuizController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(gate);
        Assert.Equal(RoleRules.AiRoles, gate!.Roles);
        Assert.Equal(
            new[] { "Admin", "SuperAdmin", "Teacher" },
            RoleRules.AiRoles.Split(',').OrderBy(r => r, StringComparer.Ordinal));

        // A class-level role gate only holds if no action opens itself back up.
        var reopened = Actions(typeof(AiQuizController))
            .Where(m => m.GetCustomAttribute<AllowAnonymousAttribute>() is not null)
            .Select(m => m.Name);
        Assert.Empty(reopened);

        // Guards the reflection against checking nothing: the paths that spend money, and the
        // free prompt a plain player no longer gets, are all on this controller.
        var routes = Actions(typeof(AiQuizController))
            .SelectMany(m => m.GetCustomAttributes<HttpMethodAttribute>())
            .Select(a => a.Template)
            .ToHashSet();
        Assert.Superset(new HashSet<string?> { "ai-generate", "ai-prompt", "ai-quota", "ai-source" }, routes);
    }

    [Fact]
    public void Saving_a_reviewed_quiz_stays_open_to_every_signed_in_user()
    {
        // ai-import saves what the author reviewed — fact quizzes go through it, and it calls no
        // model. Gating it with the AI roles would take fact quizzes away from players.
        var import = Actions(typeof(QuizController))
            .Single(m => m.GetCustomAttributes<HttpMethodAttribute>().Any(a => a.Template == "ai-import"));
        var gate = import.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(gate);
        Assert.True(string.IsNullOrEmpty(gate!.Roles));
    }

    // ── The daily limit ─────────────────────────────────────────────────────────────────────

    private static async Task<int?> LimitFor(params string[] roles)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            UserRoles = roles.Select(r => new UserRole { Role = new Role { Name = r } }).ToList(),
        };
        var users = new Mock<IUserRepository>();
        users.Setup(u => u.GetByIdAsync(user.Id, false, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var policy = new ConfigAiQuotaPolicy(Options.Create(new AiOptions { DefaultDailyQuota = 2 }), users.Object);
        return await policy.GetDailyLimitAsync(user.Id);
    }

    [Fact]
    public async Task A_superadmin_has_no_daily_cap() => Assert.Null(await LimitFor("User", "SuperAdmin"));

    [Theory]
    [InlineData("Admin")]
    [InlineData("Teacher")]
    public async Task Admins_and_teachers_get_the_default_daily_quota(string role) =>
        Assert.Equal(2, await LimitFor("User", role));

    [Fact]
    public async Task A_plain_player_gets_none() => Assert.Equal(0, await LimitFor("User"));

    [Fact]
    public async Task An_unknown_user_gets_none()
    {
        var users = new Mock<IUserRepository>();
        var policy = new ConfigAiQuotaPolicy(Options.Create(new AiOptions { DefaultDailyQuota = 2 }), users.Object);
        Assert.Equal(0, await policy.GetDailyLimitAsync(Guid.NewGuid()));
    }
}
