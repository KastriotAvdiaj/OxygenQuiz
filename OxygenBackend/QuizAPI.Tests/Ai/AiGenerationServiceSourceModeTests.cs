using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// Source mode's two server-side rules: it is offered only when the vendor entry allows it, and
/// it writes in the material's own language — English or Albanian — or not at all. Both are
/// refusals that must cost nothing, so the assertions that matter are about what was <i>not</i>
/// touched: no user lookup for a closed mode, no quota reservation for an unsupported language.
/// </summary>
public class AiGenerationServiceSourceModeTests
{
    private const string Albanian =
        "Rilindja Kombëtare ishte një periudhë e rëndësishme në historinë e shqiptarëve. Gjatë kësaj " +
        "kohe, shkrimtarët dhe atdhetarët punuan për të ruajtur gjuhën shqipe dhe për të krijuar shkolla.";

    private const string German =
        "Die Photosynthese ist ein Prozess, bei dem Pflanzen mit Hilfe von Sonnenlicht aus Kohlendioxid " +
        "und Wasser Zucker herstellen. Sie findet vor allem in den Blättern statt.";

    private static AiGenerationRequest SourceRequest(string text, string? languageName = null) => new()
    {
        Mode = AiGenerationMode.Source,
        SourceText = text,
        LanguageName = languageName,
        LanguageNames = ["English", "Albanian", "German"],
        DifficultyNames = ["Easy", "Medium", "Hard"],
        QuestionCount = 5,
        AllowedTypes = ["MultipleChoice"],
    };

    private static AiGenerationService Build(
        bool sourceModeEnabled,
        out Mock<IAiQuotaService> quota,
        out Mock<IUserRepository> users,
        bool enabled = true)
    {
        quota = new Mock<IAiQuotaService>();
        quota.Setup(q => q.IsOverBudgetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(false);
        // Every reservation is refused, so a request that passes every gate ends as QuotaExceeded
        // without a provider. That is the marker for "got past the Source-mode rules".
        quota.Setup(q => q.TryReserveAsync(It.IsAny<Guid>(), It.IsAny<AiGenerationRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new AiQuotaReservation(false, Guid.Empty, 2, 0, DateTime.UtcNow));

        users = new Mock<IUserRepository>();
        users.Setup(u => u.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new User { EmailConfirmed = true });

        return new AiGenerationService(
            Mock.Of<IQuizAiProvider>(),
            quota.Object,
            users.Object,
            new AiPromptBuilder(),
            Options.Create(new AiOptions { Enabled = enabled, SourceModeEnabled = sourceModeEnabled }),
            NullLogger<AiGenerationService>.Instance);
    }

    // ── The gate ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Source_mode_is_refused_when_the_vendor_does_not_allow_it_before_anything_per_user()
    {
        var service = Build(sourceModeEnabled: false, out var quota, out var users);

        var outcome = await service.GenerateAsync(Guid.NewGuid(), SourceRequest(Albanian));

        Assert.False(outcome.Success);
        Assert.Equal(AiErrorCodes.FeatureDisabled, outcome.ErrorCode);
        users.Verify(u => u.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        quota.Verify(q => q.TryReserveAsync(It.IsAny<Guid>(), It.IsAny<AiGenerationRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Source_mode_availability_needs_both_the_vendor_and_the_feature()
    {
        Assert.True(await Build(sourceModeEnabled: true, out _, out _).IsSourceModeAvailableAsync());
        Assert.False(await Build(sourceModeEnabled: false, out _, out _).IsSourceModeAvailableAsync());
        Assert.False(await Build(sourceModeEnabled: true, out _, out _, enabled: false).IsSourceModeAvailableAsync());
    }

    [Fact]
    public async Task Closing_source_mode_leaves_topic_mode_alone()
    {
        var service = Build(sourceModeEnabled: false, out _, out _);
        var topic = SourceRequest(Albanian) with { Mode = AiGenerationMode.Topic, Topic = "Rilindja", SourceText = null };

        var outcome = await service.GenerateAsync(Guid.NewGuid(), topic);

        // Past every gate, refused only at the reservation the mock never grants.
        Assert.Equal(AiErrorCodes.QuotaExceeded, outcome.ErrorCode);
    }

    // ── The language ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Material_in_another_language_is_refused_without_reserving_quota()
    {
        var service = Build(sourceModeEnabled: true, out var quota, out _);

        var outcome = await service.GenerateAsync(Guid.NewGuid(), SourceRequest(German));

        Assert.False(outcome.Success);
        Assert.Equal(AiErrorCodes.UnsupportedLanguage, outcome.ErrorCode);
        quota.Verify(q => q.TryReserveAsync(It.IsAny<Guid>(), It.IsAny<AiGenerationRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void The_prompt_offers_only_the_materials_language_and_ignores_a_named_one()
    {
        // The caller asked for English; the material is Albanian. Source mode writes in the
        // material's language, so English must not reach the prompt at all.
        var service = Build(sourceModeEnabled: true, out _, out _);

        var prompt = service.BuildPrompt(SourceRequest(Albanian, languageName: "English"));

        Assert.Contains("\"language\": \"Albanian\" | null", prompt);
        Assert.DoesNotContain("Write every question and every answer in English", prompt);
        Assert.DoesNotContain("\"English\"", prompt);
    }

    [Fact]
    public async Task Supported_material_passes_every_source_rule()
    {
        var service = Build(sourceModeEnabled: true, out _, out _);

        var outcome = await service.GenerateAsync(Guid.NewGuid(), SourceRequest(Albanian));

        Assert.Equal(AiErrorCodes.QuotaExceeded, outcome.ErrorCode);
    }

    [Fact]
    public async Task A_supported_language_the_caller_did_not_offer_is_refused()
    {
        // The name has to resolve back to a QuestionLanguages row in the browser; if the caller's
        // vocabulary lacks it there is nothing to resolve to.
        var service = Build(sourceModeEnabled: true, out _, out _);
        var request = SourceRequest(Albanian) with { LanguageNames = ["English"] };

        var outcome = await service.GenerateAsync(Guid.NewGuid(), request);

        Assert.Equal(AiErrorCodes.UnsupportedLanguage, outcome.ErrorCode);
    }
}
