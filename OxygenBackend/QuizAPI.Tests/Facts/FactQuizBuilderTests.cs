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
        var names = new Names(Capitals, language);
        for (var seed = 0; seed < 200; seed++)
        {
            var (payload, _) = Build(Capitals, language, seed: seed);
            foreach (var q in Questions(payload))
            {
                // The quote is the fact's statement — it says which fact the question is about.
                var fact = Capitals.Facts.Single(f => f.Labels.ContainsKey(language)
                    && q["sourceQuote"]!.GetValue<string>() == names.Fill(templates["statement"][0], f));
                var text = q["text"]!.GetValue<string>();

                switch (q["type"]!.GetValue<string>())
                {
                    case "MultipleChoice":
                        var options = q["answerOptions"]!.AsArray().Select(o => o!.AsObject()).ToList();
                        Assert.Equal(4, options.Count);
                        Assert.Single(options, o => o["isCorrect"]!.GetValue<bool>());
                        Assert.Equal(4, options.Select(o => o["text"]!.GetValue<string>()).Distinct(StringComparer.OrdinalIgnoreCase).Count());
                        var right = options.Single(o => o["isCorrect"]!.GetValue<bool>())["text"]!.GetValue<string>();
                        var asksForValue = templates["plain"].Any(t => text == names.Fill(t, fact));
                        var expected = asksForValue ? names.ValueOption(fact) : names.SubjectOption(fact);
                        Assert.Equal(expected, right);
                        break;
                    case "TrueFalse":
                        // True exactly when the statement shown is the fact's own, in any wording.
                        Assert.Equal(templates["trueFalse"].Any(t => text == names.Fill(t, fact)), q["correctAnswer"]!.GetValue<bool>());
                        break;
                    case "TypeTheAnswer":
                        Assert.Equal(names.ValueOption(fact), q["correctAnswer"]!.GetValue<string>());
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
            var highest = Peaks.Templates["English"]["highest"];
            var compare = Peaks.Templates["English"]["compare"];
            Assert.True(questions.Count(q => highest.Contains(q["text"]!.GetValue<string>())) <= 1,
                "\"Which is the highest?\" twice would be dropped as a repeat.");

            foreach (var q in questions)
            {
                var text = q["text"]!.GetValue<string>();
                if (highest.Contains(text))
                {
                    var options = q["answerOptions"]!.AsArray().Select(o => o!.AsObject()).ToList();
                    var right = options.Single(o => o["isCorrect"]!.GetValue<bool>())["text"]!.GetValue<string>();
                    Assert.Equal(options.Max(o => byName[o["text"]!.GetValue<string>()]), byName[right]);
                }
                else if (q["type"]!.GetValue<string>() == "TrueFalse")
                {
                    // "{subject} is higher than {other}." or "{other} is lower than {subject}." — true
                    // exactly when the subject is the higher one.
                    var (subject, other) = (from s in byName.Keys from o in byName.Keys from t in compare
                                            where s != o && t.Replace("{subject}", s).Replace("{other}", o) == text
                                            select (s, o)).Single();
                    Assert.Equal(byName[subject] > byName[other], q["correctAnswer"]!.GetValue<bool>());
                }
                else
                {
                    var subject = byName.Keys.Single(n => Peaks.Templates["English"]["amount"].Any(t => text == t.Replace("{subject}", n)));
                    var right = q["answerOptions"]!.AsArray().Single(o => o!["isCorrect"]!.GetValue<bool>())!["text"]!.GetValue<string>();
                    Assert.Equal($"{Math.Round(byName[subject])} m", right);
                }
            }
        }
    }

    [Fact]
    public void A_quiz_mixes_its_wordings_including_blanks()
    {
        var texts = Questions(Build(Capitals, "Albanian", count: 20, types: new[] { "MultipleChoice" }, seed: 3).Payload)
            .Select(q => q["text"]!.GetValue<string>())
            .ToList();

        // Not twenty "Cili është kryeqyteti i …?": some leave a blank, some ask the other way round.
        Assert.Contains(texts, t => t.StartsWith("Cili është kryeqyteti i "));
        Assert.Contains(texts, t => t.EndsWith("është _____."));
        Assert.True(texts.Select(t => t.Split(' ')[0]).Distinct().Count() >= 3, string.Join(" / ", texts));
    }

    [Fact]
    public void A_wording_that_cannot_be_filled_gives_way_to_the_next()
    {
        // The first wording needs a genitive these facts don't have; the second needs nothing.
        var pack = new FactPack
        {
            Slug = "test",
            Title = new() { ["Albanian"] = "Test" },
            Templates = new()
            {
                ["Albanian"] = new()
                {
                    ["plain"] = new Wordings(new[] { "Cili është kryeqyteti i {subject.gen}?", "{subject} — kryeqyteti është _____." }),
                    ["statement"] = new Wordings(new[] { "{subject}: {value} është kryeqyteti." }),
                },
            },
            Facts = Enumerable.Range(1, 6).Select(i => new Fact
            {
                Subject = $"Q{i}",
                Value = $"Q{100 + i}",
                Sitelinks = 100 - i,
                Labels = new() { ["Albanian"] = new FactLabels { Subject = $"Shteti{i}", Value = $"Qyteti{i}" } },
            }).ToList(),
        };

        var questions = Questions(JsonNode.Parse(FactQuizBuilder.Build(pack,
            new FactQuizRequest("Albanian", 6, AllTypes, Difficulties), new Random(1)).Payload)!.AsObject()).ToList();

        Assert.Equal(6, questions.Count);
        Assert.All(questions, q => Assert.EndsWith("kryeqyteti është _____.", q["text"]!.GetValue<string>()));
    }

    [Fact]
    public void A_capital_named_like_its_country_is_asked_too()
    {
        // Monaco's capital is Monaco. To someone who doesn't know, that isn't obvious — it's a fact
        // worth asking, and the browser's parser keeps it for a fact quiz (answerMayBeInText).
        var asked = Enumerable.Range(0, 50)
            .SelectMany(seed => Questions(Build(Capitals, count: 20, seed: seed).Payload))
            .Select(q => q["sourceQuote"]!.GetValue<string>());
        Assert.Contains(asked, quote => quote == "The capital of Monaco is Monaco.");
    }

    [Fact]
    public void Albanian_reads_with_the_genitive_and_definite_forms()
    {
        var questions = Enumerable.Range(0, 60)
            .SelectMany(seed => Questions(Build(Capitals, "Albanian", count: 20, seed: seed).Payload))
            .ToList();

        // The genitive after "i", in whichever wording came up.
        Assert.Contains(questions, q => q["text"]!.GetValue<string>().Contains("kryeqyteti i Francës"));
        Assert.Contains(questions, q => q["text"]!.GetValue<string>() is "Roma është kryeqyteti i cilit shtet?" or "Cilit shtet i përket kryeqyteti Roma?");
        // Options are the definite form: never "Romë" beside "Parisi".
        Assert.DoesNotContain(questions.Where(q => q["answerOptions"] is not null)
            .SelectMany(q => q["answerOptions"]!.AsArray()), o => o!["text"]!.GetValue<string>() == "Romë");
        // A typed answer accepts the label too.
        Assert.Contains(questions, q => q["type"]!.GetValue<string>() == "TypeTheAnswer"
            && q["correctAnswer"]!.GetValue<string>() == "Roma"
            && q["acceptableAnswers"]!.AsArray().Any(a => a!.GetValue<string>() == "Romë"));
    }

    [Fact]
    public void A_missing_form_skips_the_style_rather_than_writing_it_badly()
    {
        var pack = new FactPack
        {
            Slug = "test",
            Title = new() { ["Albanian"] = "Test" },
            Templates = new()
            {
                ["Albanian"] = new()
                {
                    ["plain"] = new Wordings(new[] { "Cili është kryeqyteti i {subject.gen}?" }),
                    ["trueFalse"] = new Wordings(new[] { "{value} është kryeqytet." }),
                    ["statement"] = new Wordings(new[] { "{subject}: {value} është kryeqyteti." }),
                },
            },
            Facts = Enumerable.Range(1, 6).Select(i => new Fact
            {
                Subject = $"Q{i}",
                Value = $"Q{100 + i}",
                Sitelinks = 100 - i,
                Labels = new() { ["Albanian"] = new FactLabels { Subject = $"Shteti{i}", Value = $"Qyteti{i}" } },
            }).ToList(),
        };

        var result = FactQuizBuilder.Build(pack, new FactQuizRequest("Albanian", 6, AllTypes, Difficulties), new Random(1));

        // No genitive forms in this pack: only the style that doesn't need one is asked.
        Assert.All(Questions(JsonNode.Parse(result.Payload)!.AsObject()), q => Assert.Equal("TrueFalse", q["type"]!.GetValue<string>()));
    }

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
        Assert.All(Questions(payload), q => Assert.Matches("^(Shkruani kryeqytetin e |Kryeqyteti i .+ është _____\\.$)", q["text"]!.GetValue<string>()));
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
