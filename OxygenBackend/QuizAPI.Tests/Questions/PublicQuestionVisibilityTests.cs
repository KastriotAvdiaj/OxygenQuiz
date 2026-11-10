using Moq;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.Controllers.Questions.Services.AnswerOptions;
using QuizAPI.DTOs.Question;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Media;
using Xunit;

namespace QuizAPI.Tests.Questions;

/// <summary>
/// Who may make a question public (<c>Visibility = Public</c>), and what an unknown
/// value means. docs/quiz/question-bank.md.
/// </summary>
public class PublicQuestionVisibilityTests
{
    private static readonly Guid OwnerId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static (QuestionService Service, Mock<IQuestionRepository> Repo, List<TrueFalseQuestion> Added) Build(
        TrueFalseQuestion? existing = null)
    {
        var added = new List<TrueFalseQuestion>();
        var repo = new Mock<IQuestionRepository>();
        repo.Setup(r => r.GetClassificationNamesAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(("History", "English"));
        repo.Setup(r => r.AddTrueFalseAsync(It.IsAny<TrueFalseQuestion>(), It.IsAny<CancellationToken>()))
            .Callback<TrueFalseQuestion, CancellationToken>((q, _) => added.Add(q))
            .Returns(Task.CompletedTask);
        repo.Setup(r => r.GetTrueFalseForUpdateAsync(7, It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        return (new QuestionService(repo.Object, Mock.Of<IAnswerOptionService>(), Mock.Of<IMediaAttachmentService>()),
            repo, added);
    }

    private static TrueFalseQuestionCM New(string? visibility) => new()
    {
        Text = "Rome was founded in 753 BC.", CorrectAnswer = true,
        CategoryId = 1, LanguageId = 1, DifficultyId = 1, Visibility = visibility,
    };

    private static TrueFalseQuestionUM Edit(string? visibility) => new()
    {
        Id = 7, Text = "Rome was founded in 753 BC.", CorrectAnswer = true,
        CategoryId = 1, LanguageId = 1, DifficultyId = 1, Visibility = visibility!,
    };

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Shared")]
    [InlineData("1")]
    [InlineData("nonsense")]
    public async Task An_unrecognised_visibility_creates_a_private_question(string? visibility)
    {
        var (service, _, added) = Build();

        await service.CreateTrueFalseQuestionAsync(New(visibility), OwnerId, canShare: true);

        Assert.Equal(QuestionVisibility.Private, Assert.Single(added).Visibility);
    }

    [Fact]
    public async Task Staff_can_create_a_public_question()
    {
        var (service, _, added) = Build();

        await service.CreateTrueFalseQuestionAsync(New("Public"), OwnerId, canShare: true);

        Assert.Equal(QuestionVisibility.Public, Assert.Single(added).Visibility);
    }

    [Fact]
    public async Task A_user_cannot_create_a_public_question()
    {
        var (service, _, added) = Build();

        var ex = await Assert.ThrowsAsync<ForbiddenException>(
            () => service.CreateTrueFalseQuestionAsync(New("Public"), OwnerId, canShare: false));

        Assert.Equal(QuestionService.SharedBankForbidden, ex.Message);
        Assert.Empty(added);
    }

    [Fact]
    public async Task A_user_cannot_make_their_question_public()
    {
        var question = new TrueFalseQuestion { Id = 7, UserId = OwnerId, Visibility = QuestionVisibility.Private };
        var (service, repo, _) = Build(question);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => service.UpdateTrueFalseQuestionAsync(Edit("Public"), OwnerId, canUpdateAny: false, canShare: false));

        repo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task A_user_can_keep_an_already_public_question_public_while_editing_it()
    {
        var question = new TrueFalseQuestion { Id = 7, UserId = OwnerId, Visibility = QuestionVisibility.Public };
        var (service, _, _) = Build(question);

        await service.UpdateTrueFalseQuestionAsync(Edit("Public"), OwnerId, canUpdateAny: false, canShare: false);

        Assert.Equal(QuestionVisibility.Public, question.Visibility);
    }

    [Fact]
    public async Task A_user_can_make_their_public_question_private()
    {
        var question = new TrueFalseQuestion { Id = 7, UserId = OwnerId, Visibility = QuestionVisibility.Public };
        var (service, _, _) = Build(question);

        await service.UpdateTrueFalseQuestionAsync(Edit("Private"), OwnerId, canUpdateAny: false, canShare: false);

        Assert.Equal(QuestionVisibility.Private, question.Visibility);
    }

    [Theory]
    [InlineData("Global")]
    [InlineData("global")]
    [InlineData("Public")]
    public async Task Global_is_still_accepted_as_Public(string visibility)
    {
        var (service, _, added) = Build();

        await service.CreateTrueFalseQuestionAsync(New(visibility), OwnerId, canShare: true);

        Assert.Equal(QuestionVisibility.Public, Assert.Single(added).Visibility);
    }

    [Fact]
    public void A_question_entity_starts_private()
    {
        Assert.Equal(QuestionVisibility.Private, new TrueFalseQuestion().Visibility);
    }
}
