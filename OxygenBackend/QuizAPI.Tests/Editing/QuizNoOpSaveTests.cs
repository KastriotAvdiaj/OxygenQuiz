using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Services.Media;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Editing;

/// <summary>
/// A quiz's version counts real changes. Saving the editor with nothing changed — e.g. after
/// removing questions and putting them back with Undo — used to bump it on every save
/// (docs/quiz/quiz-editing.md). And the quiz image, which the edit form sends, is actually saved.
/// </summary>
public class QuizNoOpSaveTests
{
    private static readonly Guid Owner = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private static ApplicationDbContext NewContext(string db) =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(db)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService { UserId = Owner });

    private static QuizService Service(ApplicationDbContext ctx) =>
        new(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
            NullLogger<QuizService>.Instance,
            new MediaAttachmentService(new MediaRepository(ctx), Unlimited, TimeProvider.System),
            new TestCurrentUserService { UserId = Owner });

    private static readonly IMediaQuotaPolicy Unlimited =
        Mock.Of<IMediaQuotaPolicy>(p => p.GetQuotaAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()) == Task.FromResult(new MediaQuota()));

    /// <summary>A Draft quiz (no publish gate) with two questions, at version 1.</summary>
    private static (int QuizId, int Q1, int Q2, int Cat, int Lang, int Diff) Seed(string db)
    {
        using var ctx = NewContext(db);
        // The read-back after a save joins the quiz's owner, so the owner must exist.
        ctx.Users.Add(new User
        {
            Id = Owner, Username = "owner", ImmutableName = "owner", Email = "o@example.com",
            PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
        });
        var cat = new QuestionCategory { Name = "Science", UserId = Owner };
        var lang = new QuestionLanguage { Language = "English", UserId = Owner };
        var diff = new QuestionDifficulty { Level = "Medium", UserId = Owner };
        ctx.AddRange(cat, lang, diff);
        var q1 = new TrueFalseQuestion { Text = "A", UserId = Owner, CorrectAnswer = true };
        var q2 = new TrueFalseQuestion { Text = "B", UserId = Owner, CorrectAnswer = false };
        ctx.Questions.AddRange(q1, q2);
        ctx.SaveChanges();
        var quiz = new Quiz
        {
            Title = "Body & Planet", Description = null, UserId = Owner, Status = QuizStatus.Draft,
            CategoryId = cat.Id, LanguageId = lang.Id, DifficultyId = diff.ID, Version = 1,
        };
        ctx.Quizzes.Add(quiz);
        ctx.SaveChanges();
        ctx.QuizQuestions.AddRange(
            new QuizQuestion { QuizId = quiz.Id, QuestionId = q1.Id, OrderInQuiz = 1, TimeLimitInSeconds = 10 },
            new QuizQuestion { QuizId = quiz.Id, QuestionId = q2.Id, OrderInQuiz = 2, TimeLimitInSeconds = 10 });
        ctx.SaveChanges();
        return (quiz.Id, q1.Id, q2.Id, cat.Id, lang.Id, diff.ID);
    }

    private static QuizUM Unchanged((int QuizId, int Q1, int Q2, int Cat, int Lang, int Diff) s) => new()
    {
        Id = s.QuizId, Title = "Body & Planet", Description = "", // the form sends "" for none
        CategoryId = s.Cat, LanguageId = s.Lang, DifficultyId = s.Diff, Status = "Draft", Version = 1,
        Questions = new List<QuizQuestionUM>
        {
            // What the client sends: 0-based order, normalised to 1..n by the server.
            new() { QuestionId = s.Q1, OrderInQuiz = 0, TimeLimitInSeconds = 10, PointSystem = "Standard" },
            new() { QuestionId = s.Q2, OrderInQuiz = 1, TimeLimitInSeconds = 10, PointSystem = "Standard" },
        },
    };

    [Fact]
    public async Task SavingWithNothingChanged_KeepsTheVersion()
    {
        var db = Guid.NewGuid().ToString();
        var seed = Seed(db);

        await using (var ctx = NewContext(db))
            Assert.Equal(1, (await Service(ctx).UpdateQuizAsync(Owner, Unchanged(seed)))!.Version);

        await using var check = NewContext(db);
        Assert.Equal(1, check.Quizzes.Single().Version);
        Assert.All(check.QuizQuestions, row => Assert.Null(row.RemovedInVersion));
    }

    [Fact]
    public async Task ARealChange_StillBumpsIt_AndTheImageIsSaved()
    {
        var db = Guid.NewGuid().ToString();
        var seed = Seed(db);

        var assetId = Guid.NewGuid();
        await using (var ctx = NewContext(db))
        {
            ctx.MediaAssets.Add(new QuizAPI.Models.Media.MediaAsset
            {
                Id = assetId, ContentHash = new string('a', 64), Kind = QuizAPI.Models.Media.MediaKind.Image,
                StorageKey = "images/a.webp", Url = "https://media.test/images/a.webp", ContentType = "image/webp",
                ByteSize = 1000, CreatedAt = DateTime.UtcNow,
            });
            await ctx.SaveChangesAsync();
        }

        var withImage = Unchanged(seed);
        withImage.CoverAssetId = assetId;
        await using (var ctx = NewContext(db))
            Assert.Equal(2, (await Service(ctx).UpdateQuizAsync(Owner, withImage))!.Version);

        // The client sent an asset id; the URL on the row is the asset's, copied by the server.
        await using var check = NewContext(db);
        Assert.Equal(assetId, check.Quizzes.Single().CoverAssetId);
        Assert.Equal("https://media.test/images/a.webp", check.Quizzes.Single().ImageUrl);
    }
}
