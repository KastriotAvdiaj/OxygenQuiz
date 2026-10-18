using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Controllers.Quizzes;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.DTOs.User;
using QuizAPI.Services.Audit;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// Who may read a quiz by id, and who may read its questions (the answer key).
///
/// Found in production 2026-10-18: both endpoints refused only a Draft, so a signed-out
/// <c>GET /api/quiz/20/questions</c> returned every <c>isCorrect</c>, and counting ids read every
/// Unlisted quiz. See docs/quiz/quiz-visibility.md, "Reading a quiz by id".
/// </summary>
public class QuizReadAccessTests
{
    private const int QuizId = 42;
    private const string Token = "secret-token";
    private static readonly Guid Owner = Guid.NewGuid();

    private static QuizDTO Quiz(string status) => new()
    {
        Id = QuizId,
        Title = "Friday Pub Quiz",
        Status = status,
        User = new UserBasicDTO { Id = Owner, Username = "owner", ProfileImageUrl = "" },
    };

    private static QuizController Controller(string status, TestCurrentUserService caller)
    {
        var service = new Mock<IQuizService>();
        service.Setup(s => s.GetQuizByIdAsync(QuizId, It.IsAny<Guid?>())).ReturnsAsync(Quiz(status));
        // The resolver never hands out a Draft (GetQuizByShareTokenAsync); mirror that here.
        service.Setup(s => s.GetQuizByShareTokenAsync(Token))
               .ReturnsAsync(status == "Draft" ? null : Quiz(status));
        service.Setup(s => s.GetQuizQuestionsAsync(QuizId)).ReturnsAsync(new List<QuizQuestionDTO>());

        return new QuizController(service.Object, NullLogger<QuizController>.Instance, caller,
            Mock.Of<IAuditService>());
    }

    private static TestCurrentUserService Anonymous =>
        new() { UserId = null, IsAuthenticated = false, IsAdmin = false };
    private static TestCurrentUserService Stranger => new() { IsAdmin = false };
    private static TestCurrentUserService TheOwner => new() { UserId = Owner, IsAdmin = false };
    private static TestCurrentUserService Admin => new() { IsAdmin = true };

    // ── GET /api/quiz/{id} ──────────────────────────────────────────────────

    [Fact]
    public async Task A_public_quiz_is_readable_by_anyone()
    {
        Assert.IsType<OkObjectResult>(await Controller("Public", Anonymous).GetQuizById(QuizId));
    }

    [Theory]
    [InlineData("Unlisted")]
    [InlineData("Draft")]
    public async Task A_non_public_quiz_is_hidden_from_strangers_and_guests(string status)
    {
        // The leak: Unlisted used to come back to anyone who tried the id.
        Assert.IsType<NotFoundResult>(await Controller(status, Anonymous).GetQuizById(QuizId));
        Assert.IsType<NotFoundResult>(await Controller(status, Stranger).GetQuizById(QuizId));
    }

    [Theory]
    [InlineData("Unlisted")]
    [InlineData("Draft")]
    public async Task The_owner_and_an_admin_can_read_any_status(string status)
    {
        Assert.IsType<OkObjectResult>(await Controller(status, TheOwner).GetQuizById(QuizId));
        Assert.IsType<OkObjectResult>(await Controller(status, Admin).GetQuizById(QuizId));
    }

    [Fact]
    public async Task The_share_token_opens_an_unlisted_quiz_but_not_a_draft()
    {
        Assert.IsType<OkObjectResult>(await Controller("Unlisted", Stranger).GetQuizById(QuizId, Token));
        Assert.IsType<NotFoundResult>(await Controller("Draft", Stranger).GetQuizById(QuizId, Token));
        Assert.IsType<NotFoundResult>(await Controller("Unlisted", Stranger).GetQuizById(QuizId, "wrong"));
    }

    // ── GET /api/quiz/{id}/questions — the answer key ───────────────────────

    [Theory]
    [InlineData("Public")]
    [InlineData("Unlisted")]
    [InlineData("Draft")]
    public async Task Questions_are_hidden_from_everyone_but_the_owner_and_admins(string status)
    {
        // Public included: this is the authoring view, with isCorrect on every option.
        Assert.IsType<NotFoundResult>(await Controller(status, Anonymous).GetQuizQuestions(QuizId));
        Assert.IsType<NotFoundResult>(await Controller(status, Stranger).GetQuizQuestions(QuizId));
        Assert.IsType<OkObjectResult>(await Controller(status, TheOwner).GetQuizQuestions(QuizId));
        Assert.IsType<OkObjectResult>(await Controller(status, Admin).GetQuizQuestions(QuizId));
    }
}
