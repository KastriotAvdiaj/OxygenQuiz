using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Controllers.Quizzes;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Services.Facts;
using Xunit;

namespace QuizAPI.Tests.Facts;

public class FactQuizControllerTests
{
    private static readonly FactQuizController Controller =
        new(new FactPackCatalog(NullLogger<FactPackCatalog>.Instance));

    private static FactQuizRequestDTO Request(string slug = "capitals-of-europe", string language = "English") => new()
    {
        PackSlug = slug,
        LanguageName = language,
        QuestionCount = 5,
        AllowedTypes = new() { "MultipleChoice", "TrueFalse", "TypeTheAnswer" },
        DifficultyNames = new() { "Easy", "Medium", "Hard" },
    };

    [Fact]
    public void Lists_each_pack_with_what_it_can_do()
    {
        var packs = (List<FactPackDTO>)((OkObjectResult)Controller.GetPacks().Result!).Value!;

        var capitals = packs.Single(p => p.Slug == "capitals-of-europe");
        Assert.Equal("Kryeqytetet e Evropës", capitals.Title["Albanian"]);
        Assert.Equal(49, capitals.FactsByLanguage["Albanian"]);
        Assert.Equal(new[] { "MultipleChoice", "TrueFalse", "TypeTheAnswer" }, capitals.QuestionTypes);
        Assert.Contains("Kosovo", capitals.EditorialNote);
        Assert.DoesNotContain("TypeTheAnswer", packs.Single(p => p.Slug == "peaks-of-albania").QuestionTypes);
    }

    [Fact]
    public void A_quiz_comes_back_grounded_in_Wikidata_with_the_facts_as_its_source()
    {
        var response = (FactQuizResponseDTO)((OkObjectResult)Controller.Build(Request()).Result!).Value!;

        Assert.Equal("Grounded", response.Grounding.Status);
        Assert.Equal("wikidata", response.Grounding.Source!.Provider);
        Assert.StartsWith("https://query.wikidata.org/#", response.Grounding.Source.Url);
        Assert.Contains("The capital of", response.Grounding.Source.Text);
        Assert.Contains("\"questions\"", response.Payload);
    }

    [Fact]
    public void An_unknown_pack_is_not_found() =>
        Assert.Throws<NotFoundException>(() => Controller.Build(Request(slug: "nope")));

    [Fact]
    public void A_request_the_pack_cannot_serve_is_a_validation_error() =>
        Assert.Throws<AppValidationException>(() => Controller.Build(Request(language: "German")));
}
