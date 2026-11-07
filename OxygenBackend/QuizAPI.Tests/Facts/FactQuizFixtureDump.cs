using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging.Abstractions;
using QuizAPI.Services.Facts;
using Xunit;

namespace QuizAPI.Tests.Facts;

/// <summary>
/// Not a test: records the replies the frontend's <c>fact-quiz-replies.test.ts</c> parses, so the
/// browser's parser is checked against what this builder really produces. Does nothing unless
/// asked. After changing a pack or a template:
///
/// <code>
/// FACT_DUMP=../../src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/__fixtures__/fact-quiz-replies.json \
///   dotnet test --filter FullyQualifiedName~FactQuizFixtureDump
/// </code>
/// </summary>
public class FactQuizFixtureDump
{
    [Fact]
    public void Record_the_replies_the_frontend_parses()
    {
        var path = Environment.GetEnvironmentVariable("FACT_DUMP");
        if (string.IsNullOrWhiteSpace(path)) return;

        var catalog = new FactPackCatalog(NullLogger<FactPackCatalog>.Instance);
        var replies = new JsonArray();
        foreach (var pack in catalog.All)
            foreach (var language in new[] { "English", "Albanian" })
                foreach (var seed in new[] { 1, 2 })
                {
                    var result = FactQuizBuilder.Build(
                        pack,
                        new FactQuizRequest(language, FactQuizBuilder.MaxQuestions,
                            new[] { "MultipleChoice", "TrueFalse", "TypeTheAnswer" }, new[] { "Easy", "Medium", "Hard" }),
                        new Random(seed));
                    replies.Add(new JsonObject
                    {
                        ["pack"] = pack.Slug,
                        ["language"] = language,
                        ["seed"] = seed,
                        ["payload"] = result.Payload,
                        ["sourceText"] = result.SourceText,
                        ["count"] = result.QuestionCount,
                    });
                }

        File.WriteAllText(path, replies.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        }));
    }
}
