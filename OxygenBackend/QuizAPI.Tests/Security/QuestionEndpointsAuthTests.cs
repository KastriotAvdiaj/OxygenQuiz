using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using QuizAPI.Controllers.Questions;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// Every question endpoint needs a signed-in caller (docs/deployment/known-issues.md, "Question
/// search endpoints"). The question DTOs carry the answer key — <c>AnswerOptionDTO.IsCorrect</c>,
/// <c>CorrectAnswer</c> — and the search routes used to be anonymous, so anyone could read the
/// correct answer to every global question with a plain GET.
///
/// <para>Checked by reflection over the controller rather than per route, so a new action added
/// without thinking about it is covered too: it inherits the class-level <c>[Authorize]</c>, and
/// only an explicit <c>[AllowAnonymous]</c> — a deliberate, reviewable act — can open one up.</para>
/// </summary>
public class QuestionEndpointsAuthTests
{
    private static IEnumerable<MethodInfo> Actions() =>
        typeof(QuestionsController)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes<HttpMethodAttribute>().Any());

    [Fact]
    public void The_controller_requires_a_signed_in_caller()
    {
        Assert.NotNull(typeof(QuestionsController).GetCustomAttribute<AuthorizeAttribute>());
    }

    [Fact]
    public void No_question_endpoint_is_open_to_anonymous_callers()
    {
        var open = Actions()
            .Where(m => m.GetCustomAttribute<AllowAnonymousAttribute>() is not null)
            .Select(m => m.Name)
            .ToList();

        Assert.Empty(open);
    }

    [Fact]
    public void The_search_routes_that_return_answers_are_among_the_actions_checked()
    {
        // Guards the reflection above against silently checking nothing (a renamed attribute, a
        // moved controller): the routes the finding was about must be in the set.
        var names = Actions().Select(m => m.Name).ToHashSet();
        Assert.Contains("SearchQuestions", names);
        Assert.Contains("SearchMultipleChoice", names);
        Assert.Contains("SearchTrueFalse", names);
        Assert.Contains("SearchTypeTheAnswer", names);
        Assert.Contains("GetQuestion", names);
    }
}
