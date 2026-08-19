using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// A stand-in for the hosted model. Selected with <c>Ai:Provider = "Fake"</c>, which is the
    /// only way to enable AI generation without an API key — see Program.cs.
    ///
    /// <para><b>Why this exists.</b> Because it implements <see cref="IQuizAiProvider"/>, and the
    /// provider is the only thing in the feature that talks to DeepSeek, everything else runs for
    /// real against it: the quota reserve/commit, the usage rows, the budget check, the audit
    /// entry, the error-code mapping, and — once the frontend lands — the browser parser, the
    /// review builder and the atomic import. So this is not a mock of the feature; it is the
    /// feature, with the money taken out.</para>
    ///
    /// <para><b>Forcing failures.</b> The failure paths are the ones that ship broken, because
    /// they're the ones nobody exercises. Put a trigger word in the topic (or anywhere in the
    /// source text) to reach one deterministically:</para>
    ///
    /// <list type="table">
    ///   <item><term>fail-timeout</term><description><see cref="AiErrorCodes.ProviderTimeout"/> — quota must be released</description></item>
    ///   <item><term>fail-unavailable</term><description><see cref="AiErrorCodes.ProviderUnavailable"/> — quota must be released</description></item>
    ///   <item><term>fail-garbage</term><description>prose with no JSON — exercises the retry, then ModelOutputInvalid</description></item>
    ///   <item><term>fail-fenced</term><description>valid JSON wrapped in a markdown fence — must still succeed</description></item>
    ///   <item><term>fail-empty</term><description><c>{"questions":[]}</c> — must NOT count as a valid empty quiz</description></item>
    ///   <item><term>fail-short</term><description>returns 2 questions however many were asked for</description></item>
    ///   <item><term>fail-slow</term><description>20s delay, for testing the waiting UI</description></item>
    /// </list>
    ///
    /// <para>Only ever registered outside Production (Program.cs refuses it there), so a
    /// misconfigured deploy cannot silently serve invented quizzes to real users.</para>
    /// </summary>
    public sealed class FakeQuizAiProvider : IQuizAiProvider
    {
        private readonly AiOptions _options;
        private readonly ILogger<FakeQuizAiProvider> _logger;

        /// <summary>Enough to feel real in the UI without being instant, which hides loading states.</summary>
        private static readonly TimeSpan NormalDelay = TimeSpan.FromSeconds(2);
        private static readonly TimeSpan SlowDelay = TimeSpan.FromSeconds(20);

        /// <summary>
        /// Tracks how many times this prompt has been seen, so <c>fail-garbage</c> can fail the
        /// first attempt and succeed on the retry — otherwise the retry path is untestable
        /// without also making the whole request fail. Static because the provider is transient.
        /// </summary>
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, int> AttemptCounts = new();

        public FakeQuizAiProvider(IOptions<AiOptions> options, ILogger<FakeQuizAiProvider> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public string Model => "fake-provider";

        public async Task<AiProviderResult> CompleteJsonAsync(string prompt, CancellationToken ct)
        {
            var trigger = FindTrigger(prompt);
            _logger.LogInformation("FakeQuizAiProvider responding with scenario '{Scenario}'.", trigger ?? "success");

            await Task.Delay(trigger == "fail-slow" ? SlowDelay : NormalDelay, ct);

            switch (trigger)
            {
                case "fail-timeout":
                    throw new AiProviderException(
                        AiErrorCodes.ProviderTimeout,
                        "The quiz generator took too long to respond. Please try again.");

                case "fail-unavailable":
                    throw new AiProviderException(
                        AiErrorCodes.ProviderUnavailable,
                        "The quiz generator is unavailable right now. Please try again in a moment.");

                case "fail-garbage":
                    // First attempt is unreadable; the retry succeeds. That asymmetry is the
                    // point — it proves the retry actually happens and that token usage from
                    // both attempts is summed onto one quota slot.
                    if (AttemptCounts.AddOrUpdate(Fingerprint(prompt), 1, (_, n) => n + 1) == 1)
                        return Reply("Of course! Here are some great quiz questions for you to use.");
                    return Reply(BuildQuestionsJson(prompt, countOverride: null));

                case "fail-fenced":
                    return Reply("```json\n" + BuildQuestionsJson(prompt, countOverride: null) + "\n```");

                case "fail-empty":
                    return Reply("""{"questions":[]}""");

                case "fail-short":
                    return Reply(BuildQuestionsJson(prompt, countOverride: 2));

                default:
                    return Reply(BuildQuestionsJson(prompt, countOverride: null));
            }
        }

        private static string? FindTrigger(string prompt)
        {
            string[] triggers =
            [
                "fail-timeout", "fail-unavailable", "fail-garbage",
                "fail-fenced", "fail-empty", "fail-short", "fail-slow"
            ];

            return triggers.FirstOrDefault(t => prompt.Contains(t, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Token counts are rough but not zero: a fake that reports zero usage would make the
        /// cost ledger and the budget cap untestable, which are two of the things most worth
        /// testing before real money is involved. ~4 characters per token.
        /// </summary>
        private static AiProviderResult Reply(string content) =>
            new(content, new AiTokenUsage(InputTokenGuess, content.Length / 4));

        private const int InputTokenGuess = 600;

        /// <summary>
        /// Builds a payload that satisfies the schema the prompt asks for. It reads the prompt
        /// back to discover the question count, the allowed types and the difficulty names,
        /// rather than hard-coding them — so a change to the prompt's vocabulary shows up here
        /// as a parser failure, exactly as it would with a real model that had been told
        /// something new.
        /// </summary>
        private string BuildQuestionsJson(string prompt, int? countOverride)
        {
            var count = countOverride ?? Math.Clamp(ExtractRequestedCount(prompt), 1, _options.MaxQuestionsPerGeneration);
            var types = ExtractQuoted(prompt, afterMarker: "\"type\": ");
            var difficulties = ExtractQuoted(prompt, afterMarker: "\"difficulty\": ");
            var categories = ExtractQuoted(prompt, afterMarker: "\"category\": ");
            var languages = ExtractQuoted(prompt, afterMarker: "\"language\": ");

            if (types.Count == 0) types = new List<string> { "MultipleChoice" };
            if (difficulties.Count == 0) difficulties = new List<string> { "Easy" };

            var sb = new StringBuilder();
            sb.Append('{');

            // Suggestions, emitted only when the prompt actually asked for them — mirroring a
            // real model, so the "user picked the language themselves" path is exercised too.
            sb.Append($"\"title\":{JsonSerializer.Serialize(ExtractSubject(prompt))},");
            if (categories.Count > 0)
                sb.Append($"\"category\":{JsonSerializer.Serialize(categories[0])},");
            if (languages.Count > 0)
                sb.Append($"\"language\":{JsonSerializer.Serialize(languages[0])},");

            sb.Append("\"questions\":[");

            for (var i = 0; i < count; i++)
            {
                if (i > 0) sb.Append(',');

                var type = types[i % types.Count];
                var difficulty = difficulties[i % difficulties.Count];
                var number = i + 1;

                sb.Append('{');
                sb.Append($"\"type\":{JsonSerializer.Serialize(type)},");
                sb.Append($"\"text\":{JsonSerializer.Serialize($"Sample generated question {number}?")},");
                sb.Append($"\"difficulty\":{JsonSerializer.Serialize(difficulty)},");
                sb.Append("\"pointSystem\":\"Standard\",");
                sb.Append("\"timeLimitInSeconds\":30");

                switch (type)
                {
                    case "TrueFalse":
                        sb.Append(",\"correctAnswer\":").Append(number % 2 == 0 ? "true" : "false");
                        break;

                    case "TypeTheAnswer":
                        sb.Append($",\"correctAnswer\":{JsonSerializer.Serialize($"answer {number}")}");
                        sb.Append(",\"acceptableAnswers\":[],\"isCaseSensitive\":false");
                        break;

                    default: // MultipleChoice
                        sb.Append(",\"answerOptions\":[");
                        for (var option = 1; option <= 4; option++)
                        {
                            if (option > 1) sb.Append(',');
                            sb.Append($"{{\"text\":{JsonSerializer.Serialize($"Option {option}")},");
                            sb.Append($"\"isCorrect\":{(option == 1 ? "true" : "false")}}}");
                        }
                        sb.Append("],\"allowMultipleSelections\":false");
                        break;
                }

                sb.Append('}');
            }

            sb.Append("]}");
            return sb.ToString();
        }

        /// <summary>
        /// Echoes the SUBJECT / SOURCE MATERIAL block back as a plausible title, so the
        /// pre-filled title in the review step visibly tracks what was asked for rather than
        /// being a constant that hides a wiring bug.
        /// </summary>
        private static string ExtractSubject(string prompt)
        {
            var fence = prompt.LastIndexOf("\"\"\"", StringComparison.Ordinal);
            var open = prompt.IndexOf("\"\"\"", StringComparison.Ordinal);
            if (open < 0 || fence <= open) return "Generated quiz";

            var body = prompt[(open + 3)..fence].Trim();
            if (body.Length == 0) return "Generated quiz";

            var firstLine = body.Split('\n')[0].Trim();
            return firstLine.Length <= 80 ? firstLine : firstLine[..80];
        }

        /// <summary>Reads "EXACTLY 8 quiz question(s)" back out of the prompt.</summary>
        private static int ExtractRequestedCount(string prompt)
        {
            const string marker = "EXACTLY ";
            var start = prompt.IndexOf(marker, StringComparison.Ordinal);
            if (start < 0) return 5;

            var digits = new string(prompt[(start + marker.Length)..]
                .TakeWhile(char.IsDigit)
                .ToArray());

            return int.TryParse(digits, out var count) ? count : 5;
        }

        /// <summary>
        /// Pulls the <c>"A" | "B" | "C"</c> vocabulary list that follows a marker in the prompt's
        /// shape block, so the fake only ever emits values the prompt actually offered.
        /// </summary>
        private static List<string> ExtractQuoted(string prompt, string afterMarker)
        {
            var start = prompt.IndexOf(afterMarker, StringComparison.Ordinal);
            if (start < 0) return new List<string>();

            var lineStart = start + afterMarker.Length;
            var lineEnd = prompt.IndexOf('\n', lineStart);
            var line = lineEnd < 0 ? prompt[lineStart..] : prompt[lineStart..lineEnd];

            var values = new List<string>();
            var index = 0;

            while (true)
            {
                var open = line.IndexOf('"', index);
                if (open < 0) break;
                var close = line.IndexOf('"', open + 1);
                if (close < 0) break;

                values.Add(line[(open + 1)..close]);
                index = close + 1;
            }

            return values;
        }

        /// <summary>Stable key for the retry counter — the prompt minus the stricter retry suffix.</summary>
        private static string Fingerprint(string prompt) =>
            (prompt.Length > 200 ? prompt[..200] : prompt).GetHashCode().ToString();
    }
}
