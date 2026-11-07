using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// What the provider puts on the wire. The ceiling is the one field worth pinning: too low and a
/// reasoning model's reply is cut off before its answer (docs/quiz/ai-quiz-generation-flow.md
/// §2b), too high and it breaks a free tier's per-minute limit.
/// </summary>
public class OpenAiCompatibleQuizAiProviderTests
{
    private sealed class Capture : HttpMessageHandler
    {
        public JsonNode? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Body = JsonNode.Parse(await request.Content!.ReadAsStringAsync(ct));
            const string reply =
                """{"choices":[{"message":{"content":"{\"questions\":[]}"}}],"usage":{"prompt_tokens":10,"completion_tokens":5}}""";
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(reply, Encoding.UTF8, "application/json"),
            };
        }
    }

    private static (OpenAiCompatibleQuizAiProvider Provider, Capture Handler) Create(int thinkingTokens)
    {
        var handler = new Capture();
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://vendor.test/v1/") };
        var options = new AiOptions
        {
            Enabled = true,
            ApiKey = "key",
            Model = "some/model",
            MaxOutputTokens = 4_000,
            ThinkingTokens = thinkingTokens,
        };
        var provider = new OpenAiCompatibleQuizAiProvider(
            http, Options.Create(options), NullLogger<OpenAiCompatibleQuizAiProvider>.Instance);
        return (provider, handler);
    }

    [Theory]
    [InlineData(0, null, 4_000)]       // groq: the ceiling is the answer's room, nothing added
    [InlineData(12_000, null, 16_000)] // a reasoning model: thinking on top of the quiz ceiling
    [InlineData(12_000, 1_500, 13_500)] // and on top of a per-call ceiling (the palette proposer)
    public async Task Max_tokens_is_the_callers_ceiling_plus_the_vendors_thinking(
        int thinkingTokens, int? perCallCeiling, int expected)
    {
        var (provider, handler) = Create(thinkingTokens);

        await provider.CompleteJsonAsync("Return json.", perCallCeiling, CancellationToken.None);

        Assert.Equal(expected, handler.Body!["max_tokens"]!.GetValue<int>());
    }
}
