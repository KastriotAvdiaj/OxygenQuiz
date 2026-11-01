using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Services.Facts;
using Xunit;

namespace QuizAPI.Tests.Facts;

/// <summary>
/// The builder against the <b>real</b> packs shipped in <c>QuizAPI/FactPacks</c> (built from
/// Wikidata on 2026-11-01). The property tests run many seeds: whatever the dice say, every
/// question's key has to agree with the fact it was built from.
/// </summary>
public class FactQuizBuilderTests
{
    private static readonly IFactPackCatalog Catalog = new FactPackCatalog(NullLogger<FactPackCatalog>.Instance);
    private static FactPack Capitals => Catalog.Find("capitals-of-europe")!;
    private static FactPack Peaks => Catalog.Find("peaks-of-albania")!;

    private static readonly string[] AllTypes = { "MultipleChoice", "TrueFalse", "TypeTheAnswer" };
    private static readonly string[] Difficulties = { "Easy", "Medium", "Hard" };

    private static (JsonObject Payload, FactQuizResult Result) Build(
        FactPack pack, string language = "English", int count = 10, string[]? types = null, int seed = 1)
    {
        var result = FactQuizBuilder.Build(pack, new FactQuizRequest(language, count, types ?? AllTypes, Difficulties), new Random(seed));
        return (JsonNode.Parse(result.Payload)!.AsObject(), result);
    }

    private static IEnumerable<JsonObject> Questions(JsonObject payload) =>
        payload["questions"]!.AsArray().Select(q => q!.AsObject());

    [Fact]
    public void The_shipped_packs_load() =>
        Assert.Equal(new[] { "capitals-of-europe", "peaks-of-albania" }, Catalog.All.Select(p => p.Slug).Order());

    [Fact]
    public void A_quiz_has_the_shape_of_a_model_reply()
    {
        var (payload, result) = Build(Capitals);

        Assert.Equal("Capitals of Europe", payload["title"]!.GetValue<string>());
        Assert.Equal("Geography", payload["category"]!.GetValue<string>());
        Assert.Equal("English", payload["language"]!.GetValue<string>());
        Assert.Equal(10, result.QuestionCount);
        foreach (var q in Questions(payload))
        {
            Assert.Contains(q["type"]!.GetValue<string>(), AllTypes);
            Assert.False(string.IsNullOrWhiteSpace(q["text"]!.GetValue<string>()));
            Assert.Contains(q["difficulty"]!.GetValue<string>(), Difficulties);
            Assert.Equal("Standard", q["pointSystem"]!.GetValue<string>());
            // The parser checks every quote against the source text; it has to be there.
            Assert.Contains(q["sourceQuote"]!.GetValue<string>(), result.SourceText);
        }
    }

    [Theory]
    [InlineData("English")]
    [InlineData("Albanian")]
    public void Every_capital_question_agrees_with_its_fact(string language)
    {
        var templates = Capitals.Templates[language];
        for (var seed = 0; seed < 200; seed++)
        {
            var (payload, _) = Build(Capitals, language, seed: seed);
            foreach (var q in Questions(payload))
            {
                // The quote is the fact's statement — it says which fact the question is about.
                var fact = Capitals.Facts.Single(f => f.Labels.TryGetValue(language, out var l)
                    && q["sourceQuote"]!.GetValue<string>() == templates["statement"].Replace("{subject}", l.Subject).Replace("{value}", l.Value));
                var labels = fact.Labels[language];
                var text = q["text"]!.GetValue<string>();

                switch (q["type"]!.GetValue<string>())
                {
                    case "MultipleChoice":
                        var options = q["answerOptions"]!.AsArray().Select(o => o!.AsObject()).ToList();
                        Assert.Equal(4, options.Count);
                        Assert.Single(options, o => o["isCorrect"]!.GetValue<bool>());
                        Assert.Equal(4, options.Select(o => o["text"]!.GetValue<string>()).Distinct(StringComparer.OrdinalIgnoreCase).Count());
                        var right = options.Single(o => o["isCorrect"]!.GetValue<bool>())["text"]!.GetValue<string>();
                        Assert.True(right == labels.Value || right == labels.Subject, $"{text} → {right}");
                        // The stem names one side, the right option is the other.
                        Assert.Contains(right == labels.Value ? labels.Subject : labels.Value!, text);
                        break;
                    case "TrueFalse":
                        var claimsTruth = text == templates["trueFalse"].Replace("{subject}", labels.Subject).Replace("{value}", labels.Value);
                        Assert.Equal(claimsTruth, q["correctAnswer"]!.GetValue<bool>());
                        break;
                    case "TypeTheAnswer":
                        Assert.Equal(labels.Value, q["correctAnswer"]!.GetValue<string>());
                        break;
                }
            }
        }
    }

    [Fact]
    public void Every_peak_question_agrees_with_its_heights()
    {
        var byName = Peaks.Facts.ToDictionary(f => f.Labels["English"].Subject, f => f.Amount!.Value);
        for (var seed = 0; seed < 200; seed++)
        {
            var (payload, _) = Build(Peaks, count: 10, seed: seed);
            var questions = Questions(payload).ToList();
            Assert.True(questions.Count(q => q["text"]!.GetValue<string>() == Peaks.Templates["English"]["highest"]) <= 1,
                "\"Which is the highest?\" twice would be dropped as a repeat.");

            foreach (var q in questions)
            {
                var text = q["text"]!.GetValue<string>();
                if (text == Peaks.Templates["English"]["highest"])
                {
                    var options = q["answerOptions"]!.AsArray().Select(o => o!.AsObject()).ToList();
                    var right = options.Single(o => o["isCorrect"]!.GetValue<bool>())["text"]!.GetValue<string>();
                    Assert.Equal(options.Max(o => byName[o["text"]!.GetValue<string>()]), byName[right]);
                }
                else if (q["type"]!.GetValue<string>() == "TrueFalse")
                {
                    // "{subject} is higher than {other}."
                    var names = byName.Keys.Where(n => text.Contains(n)).OrderBy(n => text.IndexOf(n)).ToList();
                    Assert.Equal(2, names.Count);
                    Assert.Equal(byName[names[0]] > byName[names[1]], q["correctAnswer"]!.GetValue<bool>());
                }
                else
                {
                    var subject = byName.Keys.Single(n => text == $"How high is {n}?");
                    var right = q["answerOptions"]!.AsArray().Single(o => o!["isCorrect"]!.GetValue<bool>())!["text"]!.GetValue<string>();
                    Assert.Equal($"{Math.Round(byName[subject])} m", right);
                }
            }
        }
    }

    [Fact]
    public void A_capital_named_like_its_country_is_never_asked()
    {
        // Monaco, San Marino, Luxembourg, Vatican City, Andorra la Vella: the stem would hold the answer.
        for (var seed = 0; seed < 50; seed++)
        {
            var (payload, _) = Build(Capitals, count: 20, seed: seed);
            Assert.DoesNotContain(Questions(payload), q => new[] { "Monaco", "San Marino", "Luxembourg", "Vatican", "Andorra" }
                .Any(n => q["sourceQuote"]!.GetValue<string>().Contains(n)));
        }
    }

    [Theory]
    [InlineData("Monaco", "Monaco", true)]
    [InlineData("Andorra", "Andorra la Vella", true)]
    [InlineData("Luksemburgu", "Luksemburg", true)]
    [InlineData("Francë", "Parisi", false)]
    [InlineData("Kosovë", "Prishtina", false)]
    public void Names_that_overlap_are_caught(string a, string b, bool overlap) =>
        Assert.Equal(overlap, FactQuizBuilder.NamesOverlap(a, b));

    [Fact]
    public void Only_the_types_asked_for_come_back()
    {
        var (payload, _) = Build(Capitals, count: 20, types: new[] { "TypeTheAnswer" });

        Assert.All(Questions(payload), q => Assert.Equal("TypeTheAnswer", q["type"]!.GetValue<string>()));
        // Other names a player might type are accepted: Pristina / Prishtina / Priština…
        Assert.Contains(Questions(payload), q => q["acceptableAnswers"]!.AsArray().Count > 0);
    }

    [Fact]
    public void Albanian_uses_the_Albanian_names()
    {
        var (payload, _) = Build(Capitals, "Albanian", count: 20, types: new[] { "TypeTheAnswer" });

        Assert.Equal("Kryeqytetet e Evropës", payload["title"]!.GetValue<string>());
        Assert.All(Questions(payload), q => Assert.StartsWith("Shkruani kryeqytetin e shtetit", q["text"]!.GetValue<string>()));
    }

    [Fact]
    public void The_best_known_facts_are_easy_and_the_least_known_hard()
    {
        Assert.Equal("Easy", FactQuizBuilder.DifficultyFor(0, 48, Difficulties));
        Assert.Equal("Medium", FactQuizBuilder.DifficultyFor(24, 48, Difficulties));
        Assert.Equal("Hard", FactQuizBuilder.DifficultyFor(47, 48, Difficulties));
        // The app's own words, in either language; by position when they match nothing.
        Assert.Equal("E vështirë", FactQuizBuilder.DifficultyFor(47, 48, new[] { "E lehtë", "Mesatare", "E vështirë" }));
        Assert.Equal("C", FactQuizBuilder.DifficultyFor(47, 48, new[] { "A", "B", "C" }));
    }

    [Fact]
    public void A_language_the_pack_has_no_templates_for_is_refused() =>
        Assert.Throws<FactQuizException>(() => Build(Capitals, "German"));

    [Fact]
    public void Types_the_pack_cannot_ask_are_refused() =>
        // Peaks have no typed-answer style: a height is never typed exactly.
        Assert.Throws<FactQuizException>(() => Build(Peaks, types: new[] { "TypeTheAnswer" }));

    [Fact]
    public void Asking_for_more_than_the_pack_has_gives_what_it_has()
    {
        var (payload, _) = Build(Peaks, count: 20);

        Assert.InRange(Questions(payload).Count(), 1, Peaks.Facts.Count);
    }
}
