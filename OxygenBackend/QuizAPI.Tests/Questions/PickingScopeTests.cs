using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.Controllers.Questions.Services.AnswerOptions;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Filtering;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Media;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Questions;

/// <summary>
/// Which questions anyone — admins included — may pick for a quiz: their own and Public ones,
/// never someone else's private question. docs/quiz/question-bank.md, "Picking".
/// </summary>
public class PickingScopeTests
{
    private static readonly Guid Me = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Stranger = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private sealed record World(string Db, int MyQuiz, int StrangersQuiz, int MinePrivate,
        int TheirsPublic, int TheirsPrivate, int Cat, int Lang, int Diff);

    // The context's query filter lets an admin see every row — the case the explicit clamps exist
    // for, so the tests run as one.
    private static ApplicationDbContext Context(string db) =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(db)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService { UserId = Me, IsAdmin = true });

    private static World Seed()
    {
        var db = Guid.NewGuid().ToString();
        using var ctx = Context(db);
        foreach (var (id, name) in new[] { (Me, "me"), (Stranger, "stranger") })
            ctx.Users.Add(new User
            {
                Id = id, Username = name, ImmutableName = name, Email = $"{name}@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            });
        var cat = new QuestionCategory { Name = "Science", UserId = Me };
        var lang = new QuestionLanguage { Language = "English", UserId = Me };
        var diff = new QuestionDifficulty { Level = "Medium", UserId = Me };
        ctx.AddRange(cat, lang, diff);
        ctx.SaveChanges();

        TrueFalseQuestion Q(string text, Guid owner, QuestionVisibility v) => new()
        {
            Text = text, UserId = owner, Visibility = v, CorrectAnswer = true,
            CategoryId = cat.Id, LanguageId = lang.Id, DifficultyId = diff.ID,
        };
        var minePrivate = Q("mine, private", Me, QuestionVisibility.Private);
        var theirsPublic = Q("theirs, public", Stranger, QuestionVisibility.Public);
        var theirsPrivate = Q("theirs, private", Stranger, QuestionVisibility.Private);
        ctx.Questions.AddRange(minePrivate, theirsPublic, theirsPrivate);
        ctx.SaveChanges();

        Quiz NewQuiz(Guid owner) => new()
        {
            Title = "Quiz", UserId = owner, Status = QuizStatus.Draft, Version = 1,
            CategoryId = cat.Id, LanguageId = lang.Id, DifficultyId = diff.ID,
        };
        var mine = NewQuiz(Me);
        var theirs = NewQuiz(Stranger);
        ctx.Quizzes.AddRange(mine, theirs);
        ctx.SaveChanges();
        ctx.QuizQuestions.AddRange(
            new QuizQuestion { QuizId = mine.Id, QuestionId = minePrivate.Id, OrderInQuiz = 1 },
            new QuizQuestion { QuizId = theirs.Id, QuestionId = theirsPrivate.Id, OrderInQuiz = 1 });
        ctx.SaveChanges();
        return new World(db, mine.Id, theirs.Id, minePrivate.Id, theirsPublic.Id, theirsPrivate.Id,
            cat.Id, lang.Id, diff.ID);
    }

    private static QuizService QuizService(ApplicationDbContext ctx) =>
        new(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
            NullLogger<QuizService>.Instance, new Mock<IMediaAttachmentService>().Object,
            new TestCurrentUserService { UserId = Me, IsAdmin = true });

    private static QuizUM Save(World w, int quizId, params int[] questionIds) => new()
    {
        Id = quizId, Title = "Quiz", Description = "", Status = "Draft", Version = 1,
        CategoryId = w.Cat, LanguageId = w.Lang, DifficultyId = w.Diff,
        Questions = questionIds
            .Select((id, i) => new QuizQuestionUM { QuestionId = id, OrderInQuiz = i, TimeLimitInSeconds = 10 })
            .ToList(),
    };

    [Fact]
    public async Task Adding_someone_elses_private_question_is_refused_even_for_an_admin()
    {
        var w = Seed();
        await using var ctx = Context(w.Db);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            QuizService(ctx).UpdateQuizAsync(Me, Save(w, w.MyQuiz, w.MinePrivate, w.TheirsPrivate), canUpdateAny: true));
        Assert.Equal(QuizAPI.Controllers.Quizzes.Services.QuizServices.QuizService.NotAttachableMessage, ex.Message);
    }

    [Fact]
    public async Task Adding_a_public_question_is_allowed()
    {
        var w = Seed();
        await using var ctx = Context(w.Db);

        var saved = await QuizService(ctx).UpdateQuizAsync(Me, Save(w, w.MyQuiz, w.MinePrivate, w.TheirsPublic));

        Assert.NotNull(saved);
    }

    [Fact]
    public async Task An_admin_editing_someone_elses_quiz_keeps_its_private_questions()
    {
        var w = Seed();
        await using var ctx = Context(w.Db);

        var saved = await QuizService(ctx).UpdateQuizAsync(
            Me, Save(w, w.StrangersQuiz, w.TheirsPrivate, w.TheirsPublic), canUpdateAny: true);

        Assert.NotNull(saved);
    }

    private static QuestionService QuestionService(ApplicationDbContext ctx) =>
        new(new QuestionRepository(ctx), Mock.Of<IAnswerOptionService>(), Mock.Of<IMediaAttachmentService>());

    [Fact]
    public async Task Own_or_public_search_never_returns_someone_elses_private_question()
    {
        var w = Seed();
        await using var ctx = Context(w.Db);

        var page = await QuestionService(ctx).SearchTrueFalseQuestionsAsync(new FilterQuery(), ownOrPublicFor: Me);

        Assert.Equal(new[] { w.MinePrivate, w.TheirsPublic }.OrderBy(i => i), page.Items.Select(q => q.Id).OrderBy(i => i));
    }

    [Fact]
    public async Task Public_only_search_returns_public_questions_even_to_an_admin()
    {
        var w = Seed();
        await using var ctx = Context(w.Db);

        var page = await QuestionService(ctx).SearchTrueFalseQuestionsAsync(new FilterQuery(), publicOnly: true);

        Assert.Equal(new[] { w.TheirsPublic }, page.Items.Select(q => q.Id));
    }
}
