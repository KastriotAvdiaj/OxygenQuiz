using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.Moderation;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Media;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Moderation;
using QuizAPI.Tests.Associations;
using QuizAPI.Tests.TestSupport;

namespace QuizAPI.Tests.Moderation;

/// <summary>
/// A database with an author's Public quiz holding one question with an image, a second quiz using
/// the same question, a staff account, and a crowd of reporters. Each call gets a fresh DbContext.
/// Notifications are recorded, not sent.
/// </summary>
internal sealed class ModerationWorld
{
    private readonly string _db = Guid.NewGuid().ToString();
    public readonly TestClock Clock = new();
    public readonly InMemoryMediaStorage Storage = new();
    public readonly List<(Guid UserId, string Title, string Message)> Sent = new();
    public ModerationOptions Options { get; } = new();

    public static readonly Guid Author = Guid.NewGuid();
    public static readonly Guid Staff = Guid.NewGuid();
    public readonly List<Guid> Reporters = Enumerable.Range(0, 12).Select(_ => Guid.NewGuid()).ToList();

    public int QuizId, OtherQuizId, QuestionId, StaffQuestionId;
    public Guid AssetId;

    public ApplicationDbContext Context(TestCurrentUserService? caller = null) => new(
        new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options,
        caller ?? new TestCurrentUserService());

    public ModerationWorld()
    {
        using var ctx = Context();
        ctx.Database.EnsureCreated(); // seeds the roles (Admin = 1, User = 2, SuperAdmin = 3)

        User U(Guid id, string name) => new()
        {
            Id = id, Username = name, ImmutableName = name, Email = $"{name}@test.local",
            PasswordHash = "x", ProfileImageUrl = "", EmailConfirmed = true,
        };
        ctx.Users.Add(U(Author, "author"));
        ctx.Users.Add(U(Staff, "staff"));
        for (var i = 0; i < Reporters.Count; i++) ctx.Users.Add(U(Reporters[i], $"reporter{i}"));
        ctx.Set<UserRole>().Add(new UserRole { UserId = Staff, RoleId = 1 });

        var asset = new MediaAsset
        {
            Id = Guid.NewGuid(), ContentHash = new string('b', 64), Kind = MediaKind.Image,
            StorageKey = "images/b.webp", ThumbKey = "images/b_400.webp", Url = "https://media.test/images/b.webp",
            ContentType = "image/webp", ByteSize = 1000, CreatedAt = DateTime.UtcNow, FirstAttachedAt = DateTime.UtcNow,
        };
        ctx.MediaAssets.Add(asset);
        Storage.Objects["images/b.webp"] = (new byte[] { 1 }, "image/webp");
        Storage.Objects["images/b_400.webp"] = (new byte[] { 1 }, "image/webp");

        var question = new TrueFalseQuestion
        {
            Text = "Is the sky green?", UserId = Author, Type = QuestionType.TrueFalse, CategoryId = 1, LanguageId = 1, DifficultyId = 1,
            MediaAssetId = asset.Id, MediaUrl = asset.Url, MediaType = QuestionMediaType.Image,
        };
        var staffQuestion = new TrueFalseQuestion
        {
            Text = "House question", UserId = Staff, Type = QuestionType.TrueFalse, CategoryId = 1, LanguageId = 1, DifficultyId = 1,
        };
        ctx.Questions.AddRange(question, staffQuestion);
        var quiz = new Quiz { Title = "Colours", UserId = Author, Status = QuizStatus.Public, CoverAssetId = asset.Id, ImageUrl = asset.Url };
        var other = new Quiz { Title = "More colours", UserId = Author, Status = QuizStatus.Public };
        ctx.Quizzes.AddRange(quiz, other);
        ctx.SaveChanges();
        ctx.QuizQuestions.Add(new QuizQuestion { QuizId = quiz.Id, QuestionId = question.Id, CreatedInVersion = 1 });
        ctx.QuizQuestions.Add(new QuizQuestion { QuizId = other.Id, QuestionId = question.Id, CreatedInVersion = 1 });
        ctx.SaveChanges();

        (QuizId, OtherQuizId, QuestionId, StaffQuestionId, AssetId) = (quiz.Id, other.Id, question.Id, staffQuestion.Id, asset.Id);
    }

    private INotificationService Notifications()
    {
        var mock = new Mock<INotificationService>();
        mock.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<Guid, string, string, string, CancellationToken>((u, _, t, m, _) => Sent.Add((u, t, m)))
            .ReturnsAsync(new QuizAPI.DTOs.Notification.NotificationDTO());
        return mock.Object;
    }

    public ContentReportService Reports(ApplicationDbContext ctx) =>
        new(new ModerationRepository(ctx), Notifications(), Microsoft.Extensions.Options.Options.Create(Options), Clock);

    public ModerationService Moderation(ApplicationDbContext ctx) =>
        new(new ModerationRepository(ctx), new MediaRepository(ctx), Storage, Notifications(), Mock.Of<IAuditService>(),
            Microsoft.Extensions.Options.Options.Create(Options), Clock, NullLogger<ModerationService>.Instance);

    public async Task<ReportReceiptDTO> Report(Guid reporter, string reason, int? questionId = null, int? quizId = null, string? details = null)
    {
        await using var ctx = Context();
        return await Reports(ctx).SubmitAsync(reporter, new SubmitReportCM
        {
            QuestionId = questionId, QuizId = quizId, Reason = reason,
            Details = details ?? (reason is "WrongAnswer" or "Other" ? "It's blue." : null),
        });
    }

    public async Task<T> With<T>(Func<ApplicationDbContext, Task<T>> f)
    {
        await using var ctx = Context();
        return await f(ctx);
    }

    public Task<QuestionBase> Question(int id) => With(c => c.Questions.IgnoreQueryFilters().AsNoTracking().SingleAsync(q => q.Id == id));
    public Task<Quiz> Quiz(int id) => With(c => c.Quizzes.IgnoreQueryFilters().AsNoTracking().SingleAsync(q => q.Id == id));
}
