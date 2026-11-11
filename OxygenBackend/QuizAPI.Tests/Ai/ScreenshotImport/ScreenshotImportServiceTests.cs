using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Data;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Ai.ScreenshotImport;
using QuizAPI.Services.Media;
using QuizAPI.Tests.TestSupport;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace QuizAPI.Tests.Ai.ScreenshotImport;

/// <summary>
/// Screenshot import's reading and deciding (docs/quiz/screenshot-import.md). The model is faked
/// with the replies the fake provider serves in development, so every review-row state appears.
/// </summary>
public class ScreenshotImportServiceTests
{
    private static readonly Guid Admin = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private const string ReadReply = """
        {"questions":[
          {"text":"What is the capital of Kosovo?","seenType":"MultipleChoice","shownOptions":["Prishtina","Prizren","Peja","Gjakova"],"shownAnswer":"Prishtina","needsItsPicture":false,"category":"Geography","difficulty":"Easy","language":"English"},
          {"text":"In which year did Skanderbeg die?","seenType":"TypeTheAnswer","shownOptions":[],"shownAnswer":null,"needsItsPicture":false,"imageQuery":"Skanderbeg","category":"History","difficulty":"Legendary","language":"English"},
          {"text":"The Danube flows into the Black Sea.","seenType":"TrueFalse","shownOptions":[],"shownAnswer":"true","needsItsPicture":false,"category":"Geography","language":"English"},
          {"text":"Tell me what is missing from this flag","seenType":"TypeTheAnswer","shownOptions":[],"shownAnswer":null,"needsItsPicture":true,"imageQuery":"https://example.com/flag.png"},
          {"text":"What is the capital of France?","seenType":"MultipleChoice","shownOptions":["Paris","London","Berlin","Madrid"],"shownAnswer":"Paris","needsItsPicture":false,"category":"Geography","language":"English"}
        ]}
        """;

    private const string CompleteReply = """
        {"answers":[
          {"index":0,"correctAnswer":"Prishtina","wrongOptions":["Prizren","Peja","Gjakova"],"acceptableAnswers":["Pristina"]},
          {"index":1,"correctAnswer":"1468","wrongOptions":["1443","1479","1468"],"acceptableAnswers":[],"explanation":"He died in Lezhë in 1468."}
        ]}
        """;

    private sealed class World
    {
        public readonly string Db = Guid.NewGuid().ToString();
        public readonly Mock<IQuizAiProvider> Provider = new();
        public AiOptions Ai = new()
        {
            Enabled = true, ImagesEnabled = true,
            ScreenshotImport = new ScreenshotImportOptions { Enabled = true, DailyImagesPerAdmin = 30 },
        };
        public int FranceId;

        public ApplicationDbContext Context() =>
            new(new DbContextOptionsBuilder<ApplicationDbContext>()
                    .UseInMemoryDatabase(Db)
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                    .Options,
                new TestCurrentUserService { UserId = Admin, IsAdmin = true });

        public World(string read = ReadReply, string complete = CompleteReply)
        {
            using (var ctx = Context())
            {
                ctx.Users.Add(new User
                {
                    Id = Admin, Username = "admin", ImmutableName = "admin", Email = "a@example.com",
                    PasswordHash = "x", ProfileImageUrl = string.Empty, EmailConfirmed = true,
                });
                var geo = new QuestionCategory { Name = "Geography", UserId = Admin };
                var history = new QuestionCategory { Name = "History", UserId = Admin };
                var english = new QuestionLanguage { Language = "English", UserId = Admin };
                var easy = new QuestionDifficulty { Level = "Easy", UserId = Admin };
                ctx.AddRange(geo, history, english, easy);
                ctx.SaveChanges();
                var france = new TrueFalseQuestion
                {
                    Text = "What is the capital of France?", UserId = Admin, CorrectAnswer = true,
                    CategoryId = geo.Id, LanguageId = english.Id, DifficultyId = easy.ID,
                };
                ctx.Questions.Add(france);
                ctx.SaveChanges();
                FranceId = france.Id;
            }

            Provider.SetupGet(p => p.Model).Returns("test-model");
            Provider.Setup(p => p.CompleteJsonAsync(
                    It.Is<string>(s => s.Contains(ScreenshotImportPrompts.ReadMarker)), It.IsAny<int?>(),
                    It.IsAny<AiCallOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AiProviderResult(read, new AiTokenUsage(1000, 200)));
            Provider.Setup(p => p.CompleteJsonAsync(
                    It.Is<string>(s => s.Contains(ScreenshotImportPrompts.CompleteMarker)), It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AiProviderResult(complete, new AiTokenUsage(500, 800)));
        }

        public ScreenshotImportService Service(ApplicationDbContext ctx) =>
            new(Provider.Object, new AiGenerationUsageRepository(ctx), new QuestionRepository(ctx),
                new QuestionCategoryRepository(ctx), new QuestionDifficultyRepository(ctx),
                new QuestionLanguageRepository(ctx), Options.Create(Ai), Options.Create(new MediaOptions()),
                NullLogger<ScreenshotImportService>.Instance);
    }

    private static byte[] Png(int width = 64, int height = 48)
    {
        using var image = new Image<Rgba32>(width, height);
        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }

    private static async Task<ScreenshotReadResult> Read(World w, ScreenshotMakeType make = ScreenshotMakeType.AsTheyAppear, bool unlimited = false)
    {
        await using var ctx = w.Context();
        return await w.Service(ctx).ReadAsync(Admin, unlimited, Png(), make, CancellationToken.None);
    }

    [Fact]
    public async Task Reads_every_row_state_and_marks_where_each_answer_came_from()
    {
        var w = new World();
        var result = await Read(w);

        Assert.Equal(5, result.Questions.Count);
        var kosovo = result.Questions[0];
        Assert.True(kosovo.AnswerFromImage);
        Assert.True(kosovo.OptionsFromImage);
        Assert.Equal(new[] { "Prizren", "Peja", "Gjakova" }, kosovo.WrongOptions);

        var skanderbeg = result.Questions[1];
        Assert.False(skanderbeg.AnswerFromImage);
        Assert.Equal("1468", skanderbeg.CorrectAnswer);
        Assert.DoesNotContain("1468", skanderbeg.WrongOptions); // the model listed the answer as wrong; dropped
        Assert.Null(skanderbeg.DifficultyId);                   // "Legendary" matches no row

        Assert.Equal(QuestionType.TrueFalse, result.Questions[2].Type);
        Assert.Equal("true", result.Questions[2].CorrectAnswer);

        var flag = result.Questions[3];
        Assert.True(flag.NeedsItsPicture);
        Assert.Null(flag.ImageQuery);                           // a URL is never kept

        Assert.Equal(w.FranceId, result.Questions[4].DuplicateOfId);
    }

    [Fact]
    public async Task Multiple_choice_is_applied_to_everything_but_true_false()
    {
        var result = await Read(new World(), ScreenshotMakeType.MultipleChoice);

        Assert.Equal(QuestionType.MultipleChoice, result.Questions[1].Type);
        Assert.Equal(QuestionType.TrueFalse, result.Questions[2].Type);
    }

    [Fact]
    public async Task The_image_is_read_with_thinking_off_and_sent_as_webp()
    {
        var w = new World();
        await Read(w);

        w.Provider.Verify(p => p.CompleteJsonAsync(
            It.IsAny<string>(), It.IsAny<int?>(),
            It.Is<AiCallOptions>(o => o.ReasoningEffort == "none" && o.Image!.ContentType == "image/webp"),
            It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task An_image_with_no_questions_costs_nothing_from_the_allowance()
    {
        var w = new World(read: """{"questions":[]}""");
        var result = await Read(w);

        Assert.Empty(result.Questions);
        Assert.Equal(30, result.ImagesLeftToday);
        await using var ctx = w.Context();
        Assert.Equal(AiGenerationStatus.Released, Assert.Single(ctx.AiGenerationUsages).Status);
    }

    [Fact]
    public async Task The_daily_allowance_counts_images_and_SuperAdmins_have_none()
    {
        var w = new World();
        w.Ai.ScreenshotImport.DailyImagesPerAdmin = 1;

        Assert.Equal(0, (await Read(w)).ImagesLeftToday);
        await Assert.ThrowsAsync<QuotaExceededException>(() => Read(w));
        Assert.Null((await Read(w, unlimited: true)).ImagesLeftToday);
    }

    [Fact]
    public async Task Off_until_switched_on_and_until_the_model_reads_images()
    {
        var w = new World();
        w.Ai.ScreenshotImport.Enabled = false;
        await Assert.ThrowsAsync<AppValidationException>(() => Read(w));

        w.Ai.ScreenshotImport.Enabled = true;
        w.Ai.ImagesEnabled = false;
        await Assert.ThrowsAsync<AppValidationException>(() => Read(w));
    }

    [Fact]
    public async Task A_file_that_is_not_an_image_is_refused_before_any_model_call()
    {
        var w = new World();
        await using var ctx = w.Context();

        await Assert.ThrowsAsync<AppValidationException>(() =>
            w.Service(ctx).ReadAsync(Admin, false, "PK\u0003\u0004 not a zip either"u8.ToArray(),
                ScreenshotMakeType.AsTheyAppear, CancellationToken.None));
        w.Provider.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task A_refused_api_key_says_so_instead_of_try_again()
    {
        var w = new World();
        w.Provider.Setup(p => p.CompleteJsonAsync(
                It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<AiCallOptions>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AiProviderException(AiErrorCodes.ProviderUnavailable, "unavailable", upstreamStatus: 401));

        var ex = await Assert.ThrowsAsync<ServiceUnavailableException>(() => Read(w));

        Assert.Contains("API key", ex.Message);
        Assert.DoesNotContain("Try this one again", ex.Message);
    }

    [Fact]
    public async Task An_outage_still_says_try_again()
    {
        var w = new World();
        w.Provider.Setup(p => p.CompleteJsonAsync(
                It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<AiCallOptions>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AiProviderException(AiErrorCodes.ProviderUnavailable, "unavailable", upstreamStatus: 503));

        var ex = await Assert.ThrowsAsync<ServiceUnavailableException>(() => Read(w));

        Assert.Contains("Try this one again", ex.Message);
    }

    [Fact]
    public async Task Multiple_choice_sticks_even_when_no_wrong_options_came_back()
    {
        var w = new World(complete: """{"answers":[]}""");
        var result = await Read(w, ScreenshotMakeType.MultipleChoice);

        // Skanderbeg: no answer on the image and the completion gave nothing — dropped; the
        // Kosovo row still carries its shown options.
        Assert.All(result.Questions.Where(q => !q.NeedsItsPicture && q.SeenType != QuestionType.TrueFalse),
            q => Assert.Equal(QuestionType.MultipleChoice, q.Type));
    }

    [Fact]
    public void Types_are_sent_by_name_not_number()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(
            new ScreenshotQuestionDTO { Type = QuestionType.TypeTheAnswer, SeenType = QuestionType.MultipleChoice });

        Assert.Contains("\"Type\":\"TypeTheAnswer\"", json);
        Assert.Contains("\"SeenType\":\"MultipleChoice\"", json);
    }

    [Fact]
    public async Task Screenshot_reads_never_take_a_quiz_generation_slot()
    {
        var w = new World();
        await Read(w);

        await using var ctx = w.Context();
        Assert.Equal(0, await new AiGenerationUsageRepository(ctx)
            .CountSlotsUsedSinceAsync(Admin, DateTime.UtcNow.Date));
    }
}
