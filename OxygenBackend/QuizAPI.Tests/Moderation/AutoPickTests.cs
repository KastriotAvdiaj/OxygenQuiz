using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Common;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.Controllers.Questions.Services.AnswerOptions;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Media;
using QuizAPI.Services.Permissions;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Moderation;

/// <summary>
/// <c>quiz:autopick</c> puts a creator's quizzes straight into the picked catalogue, and a content
/// edit by anyone without it takes a picked quiz out again. docs/media/moderation.md, "Picked and
/// community quizzes". The Associations board save is covered in AssociationBoardServiceTests.
/// </summary>
public class AutoPickTests
{
    private static readonly Guid OwnerId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static IPermissionService Permissions(bool autoPick)
    {
        var mock = new Mock<IPermissionService>();
        mock.Setup(p => p.HasPermissionAsync(It.IsAny<Guid>(), QuizHouse.AutoPickPermission)).ReturnsAsync(autoPick);
        return mock.Object;
    }

    // ── Creation ────────────────────────────────────────────────────────────

    [Fact]
    public void An_autopick_creator_s_quiz_is_picked_but_not_house()
    {
        var quiz = new Quiz();
        QuizHouse.Stamp(quiz, creatorIsStaff: false, DateTime.UtcNow, creatorCanAutoPick: true);

        Assert.True(quiz.IsPicked);
        Assert.NotNull(quiz.PickedAt);
        Assert.False(quiz.IsHouse); // so it carries the "Oxygen Pick" badge
    }

    [Fact]
    public async Task Staff_always_auto_pick_and_others_need_the_permission()
    {
        Assert.True(await QuizHouse.CanAutoPickAsync(permissions: null, OwnerId, isStaff: true));
        Assert.False(await QuizHouse.CanAutoPickAsync(permissions: null, OwnerId, isStaff: false));
        Assert.True(await QuizHouse.CanAutoPickAsync(Permissions(autoPick: true), OwnerId, isStaff: false));
        Assert.False(await QuizHouse.CanAutoPickAsync(Permissions(autoPick: false), OwnerId, isStaff: false));
        Assert.False(await QuizHouse.CanAutoPickAsync(Permissions(autoPick: true), userId: null, isStaff: false));
    }

    // ── Editing a Classic quiz ──────────────────────────────────────────────

    private sealed class World
    {
        private readonly string _db = Guid.NewGuid().ToString();
        public int QuizId, CategoryId, LanguageId, DifficultyId;

        public ApplicationDbContext Context() =>
            new(new DbContextOptionsBuilder<ApplicationDbContext>()
                    .UseInMemoryDatabase(_db)
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                    .Options,
                new TestCurrentUserService());

        public World()
        {
            using var ctx = Context();
            ctx.Users.Add(new User
            {
                Id = OwnerId, Username = "owner", ImmutableName = "owner", Email = "o@example.com",
                PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
            });
            var category = new QuestionCategory { Name = "History", UserId = OwnerId };
            var language = new QuestionLanguage { Language = "English", UserId = OwnerId };
            var difficulty = new QuestionDifficulty { Level = "Easy", UserId = OwnerId };
            ctx.AddRange(category, language, difficulty);
            ctx.SaveChanges();
            (CategoryId, LanguageId, DifficultyId) = (category.Id, language.Id, difficulty.ID);

            var quiz = new Quiz
            {
                Title = "Rome", Status = QuizStatus.Public, UserId = OwnerId, Version = 1,
                CategoryId = category.Id, LanguageId = language.Id, DifficultyId = difficulty.ID,
                IsPicked = true, PickedAt = DateTime.UtcNow,
            };
            ctx.Quizzes.Add(quiz);
            ctx.SaveChanges();
            QuizId = quiz.Id;
        }

        public async Task UpdateAsync(bool editorCanAutoPick, string title = "Rome", string status = "Public")
        {
            using var ctx = Context();
            var service = new QuizService(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
                NullLogger<QuizService>.Instance, new Mock<IMediaAttachmentService>().Object,
                new TestCurrentUserService { UserId = OwnerId, IsAdmin = false },
                Permissions(editorCanAutoPick));
            await service.UpdateQuizAsync(OwnerId, new QuizUM
            {
                Id = QuizId, Version = 1, Title = title, Status = status,
                CategoryId = CategoryId, LanguageId = LanguageId, DifficultyId = DifficultyId,
            });
        }

        public Quiz Quiz()
        {
            using var ctx = Context();
            return ctx.Quizzes.Single(q => q.Id == QuizId);
        }
    }

    [Fact]
    public async Task Editing_a_picked_quiz_without_autopick_unpicks_it()
    {
        var w = new World();
        await w.UpdateAsync(editorCanAutoPick: false, title: "Rome, renamed");

        Assert.False(w.Quiz().IsPicked);
        Assert.Null(w.Quiz().PickedAt);
    }

    [Fact]
    public async Task Editing_a_picked_quiz_with_autopick_keeps_it_picked()
    {
        var w = new World();
        await w.UpdateAsync(editorCanAutoPick: true, title: "Rome, renamed");

        Assert.True(w.Quiz().IsPicked);
    }

    [Fact]
    public async Task Only_changing_the_status_keeps_the_pick()
    {
        var w = new World();
        await w.UpdateAsync(editorCanAutoPick: false, status: "Draft");

        Assert.Equal(QuizStatus.Draft, w.Quiz().Status);
        Assert.True(w.Quiz().IsPicked);
    }

    // ── Editing a question, which every quiz using it shows ─────────────────

    private static async Task<Mock<IQuestionRepository>> EditQuestionAsync(bool editorCanAutoPick)
    {
        var repo = new Mock<IQuestionRepository>();
        repo.Setup(r => r.GetTrueFalseForUpdateAsync(7, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TrueFalseQuestion { Id = 7, UserId = OwnerId });
        repo.Setup(r => r.GetClassificationNamesAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(("History", "English"));
        var service = new QuestionService(repo.Object, Mock.Of<IAnswerOptionService>(), Mock.Of<IMediaAttachmentService>(),
            Permissions(editorCanAutoPick));

        await service.UpdateTrueFalseQuestionAsync(new TrueFalseQuestionUM
        {
            Id = 7, Text = "Rome was founded in 753 BC.", CorrectAnswer = true,
            CategoryId = 1, LanguageId = 1, DifficultyId = 1, Visibility = "Global",
        }, OwnerId, canUpdateAny: false);
        return repo;
    }

    [Fact]
    public async Task A_question_edit_without_autopick_unpicks_the_quizzes_it_is_in()
    {
        var repo = await EditQuestionAsync(editorCanAutoPick: false);
        repo.Verify(r => r.UnpickQuizzesContainingAsync(7, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_question_edit_with_autopick_leaves_them_picked()
    {
        var repo = await EditQuestionAsync(editorCanAutoPick: true);
        repo.Verify(r => r.UnpickQuizzesContainingAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
