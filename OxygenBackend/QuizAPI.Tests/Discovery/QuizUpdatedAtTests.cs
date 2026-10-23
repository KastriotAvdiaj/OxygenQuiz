using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using QuizAPI.Services.Media;
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
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Discovery;

/// <summary>
/// <c>Quiz.UpdatedAt</c> is the sitemap's <c>&lt;lastmod&gt;</c>, so it must move whenever what a
/// quiz shows or plays changes. docs/quiz/quiz-listing.md, "Quiz.UpdatedAt". The Associations board
/// save is covered in AssociationBoardServiceTests.
/// </summary>
public class QuizUpdatedAtTests
{
    private static readonly Guid OwnerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTime LongAgo = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

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
                Title = "Rome", Status = QuizStatus.Draft, UserId = OwnerId, Version = 1,
                CategoryId = category.Id, LanguageId = language.Id, DifficultyId = difficulty.ID,
                CreatedAt = LongAgo, UpdatedAt = LongAgo,
            };
            ctx.Quizzes.Add(quiz);
            ctx.SaveChanges();
            QuizId = quiz.Id;
        }

        public QuizService Service(ApplicationDbContext ctx) =>
            new(new QuizRepository(ctx), new Mock<IQuestionRepository>().Object,
                NullLogger<QuizService>.Instance, new Mock<IMediaAttachmentService>().Object,
                new TestCurrentUserService { UserId = OwnerId, IsAdmin = false });

        public DateTime UpdatedAt()
        {
            using var ctx = Context();
            return ctx.Quizzes.Single(q => q.Id == QuizId).UpdatedAt;
        }
    }

    [Fact]
    public void A_new_quiz_starts_with_UpdatedAt_set()
    {
        var quiz = new Quiz();
        Assert.NotEqual(default, quiz.UpdatedAt);
    }

    [Fact]
    public async Task Editing_a_quiz_bumps_UpdatedAt()
    {
        var w = new World();
        using (var ctx = w.Context())
        {
            await w.Service(ctx).UpdateQuizAsync(OwnerId, new QuizUM
            {
                Id = w.QuizId, Version = 1, Title = "Rome, renamed", Status = "Draft",
                CategoryId = w.CategoryId, LanguageId = w.LanguageId, DifficultyId = w.DifficultyId,
            });
        }

        Assert.True(w.UpdatedAt() > LongAgo);
    }

    [Fact]
    public async Task Changing_the_status_bumps_UpdatedAt()
    {
        var w = new World();
        using (var ctx = w.Context())
            await w.Service(ctx).SetQuizStatusAsync(OwnerId, w.QuizId, QuizStatus.Unlisted);

        Assert.True(w.UpdatedAt() > LongAgo);
    }

    // ── Question edits, including from the question bank ────────────────────

    private static (QuestionService Service, Mock<IQuestionRepository> Repo) QuestionService(TrueFalseQuestion? found)
    {
        var repo = new Mock<IQuestionRepository>();
        repo.Setup(r => r.GetTrueFalseForUpdateAsync(7, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(found);
        repo.Setup(r => r.GetClassificationNamesAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(("History", "English"));
        return (new QuestionService(repo.Object, Mock.Of<IAnswerOptionService>(), Mock.Of<IMediaAttachmentService>()), repo);
    }

    private static TrueFalseQuestionUM Edit => new()
    {
        Id = 7, Text = "Rome was founded in 753 BC.", CorrectAnswer = true,
        CategoryId = 1, LanguageId = 1, DifficultyId = 1, Visibility = "Global",
    };

    [Fact]
    public async Task Editing_a_question_touches_every_quiz_it_is_live_in()
    {
        var (service, repo) = QuestionService(new TrueFalseQuestion { Id = 7, UserId = OwnerId });

        await service.UpdateTrueFalseQuestionAsync(Edit, OwnerId, canUpdateAny: false);

        repo.Verify(r => r.TouchQuizzesContainingAsync(7, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Every_question_type_touches_its_quizzes()
    {
        var (service, repo) = QuestionService(found: null);
        repo.Setup(r => r.GetMultipleChoiceForUpdateAsync(8, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MultipleChoiceQuestion { Id = 8, UserId = OwnerId });
        repo.Setup(r => r.GetTypeTheAnswerForUpdateAsync(9, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TypeTheAnswerQuestion { Id = 9, UserId = OwnerId, CorrectAnswer = "Rome" });

        await service.UpdateMultipleChoiceQuestionAsync(new MultipleChoiceQuestionUM
        {
            Id = 8, Text = "Capital of Italy?", CategoryId = 1, LanguageId = 1, DifficultyId = 1, Visibility = "Global",
        }, OwnerId, canUpdateAny: false);
        await service.UpdateTypeTheAnswerQuestionAsync(new TypeTheAnswerQuestionUM
        {
            Id = 9, Text = "Capital of Italy?", CorrectAnswer = "Rome",
            CategoryId = 1, LanguageId = 1, DifficultyId = 1, Visibility = "Global",
        }, OwnerId, canUpdateAny: false);

        repo.Verify(r => r.TouchQuizzesContainingAsync(8, It.IsAny<CancellationToken>()), Times.Once);
        repo.Verify(r => r.TouchQuizzesContainingAsync(9, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_refused_question_edit_touches_nothing()
    {
        var (service, repo) = QuestionService(found: null);

        await service.UpdateTrueFalseQuestionAsync(Edit, OwnerId, canUpdateAny: false);

        repo.Verify(r => r.TouchQuizzesContainingAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
