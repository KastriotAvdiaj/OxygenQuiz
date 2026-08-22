using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// DeepSeek adapter. The API speaks the OpenAI ChatCompletions wire format, so this class is
    /// close to a generic OpenAI-compatible client — which is the point: pointing
    /// <c>Ai:BaseUrl</c> and <c>Ai:Model</c> at another OpenAI-compatible vendor should work
    /// without a code change.
    ///
    /// Two provider-specific details worth knowing:
    ///  - JSON mode is <c>response_format: { "type": "json_object" }</c> and it <b>requires the
    ///    word "json" to appear in the prompt</b>. <see cref="AiPromptBuilder"/> guarantees that;
    ///    this class asserts it rather than letting the provider 400 mysteriously.
    ///  - JSON mode guarantees syntactic validity, not our schema. DeepSeek does not support
    ///    OpenAI's strict <c>json_schema</c> on the stable endpoint, so semantic validation stays
    ///    where it already lives (plan §5.2).
    /// </summary>
    public sealed class DeepSeekQuizAiProvider : IQuizAiProvider
    {
        private readonly HttpClient _http;
        private readonly AiOptions _options;
        private readonly ILogger<DeepSeekQuizAiProvider> _logger;

        /// <summary>One retry only. A second failure is a real outage, and the user is waiting.</summary>
        private const int MaxAttempts = 2;
        private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(2);

        private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

        public DeepSeekQuizAiProvider(
            HttpClient http,
            IOptions<AiOptions> options,
            ILogger<DeepSeekQuizAiProvider> logger)
        {
            _http = http;
            _options = options.Value;
            _logger = logger;
        }

        public string Model => _options.Model;

        public async Task<AiProviderResult> CompleteJsonAsync(string prompt, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(_options.ApiKey))
                throw new AiProviderException(AiErrorCodes.FeatureDisabled, "The AI provider is not configured.");

            // Fail loudly on our own mistake rather than shipping a request the provider rejects
            // with an opaque 400. See the JSON-mode note in the class summary.
            if (!prompt.Contains("json", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    "DeepSeek JSON mode requires the word \"json\" in the prompt, and this prompt does not contain it.");

            var body = new ChatRequest
            {
                Model = _options.Model,
                Temperature = _options.Temperature,
                Stream = false,
                // The runaway guard. A model in a repetition loop will emit output until it hits
                // a limit; if we don't set one, that limit is the model's 384K ceiling and a
                // single call costs ~250× what it should. Truncated output fails JSON extraction
                // and releases the user's quota slot, which is the correct outcome.
                MaxTokens = _options.MaxOutputTokens,
                ResponseFormat = new ResponseFormat("json_object"),
                Messages = new[] { new ChatMessage("user", prompt) }
            };

            for (var attempt = 1; ; attempt++)
            {
                // A per-call budget that is distinguishable from the caller giving up. Without the
                // linked token we could not tell "the model is slow" from "the user closed the tab",
                // and those have different quota consequences.
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

                try
                {
                    using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
                    {
                        Content = JsonContent.Create(body, options: SerializerOptions)
                    };
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

                    using var response = await _http.SendAsync(request, timeoutCts.Token);

                    if (!response.IsSuccessStatusCode)
                    {
                        var detail = await SafeReadAsync(response, timeoutCts.Token);

                        if (IsRetryable(response.StatusCode) && attempt < MaxAttempts)
                        {
                            _logger.LogWarning(
                                "DeepSeek returned {Status} on attempt {Attempt}; retrying. {Detail}",
                                (int)response.StatusCode, attempt, detail);
                            await Task.Delay(RetryDelay, ct);
                            continue;
                        }

                        // Log the upstream detail; never hand it to the user — it can echo the
                        // prompt back, and the prompt can contain their source material.
                        _logger.LogError(
                            "DeepSeek call failed with {Status} after {Attempt} attempt(s). {Detail}",
                            (int)response.StatusCode, attempt, detail);

                        throw new AiProviderException(
                            AiErrorCodes.ProviderUnavailable,
                            "The quiz generator is unavailable right now. Please try again in a moment.");
                    }

                    var payload = await response.Content.ReadFromJsonAsync<ChatResponse>(SerializerOptions, timeoutCts.Token);

                    var content = payload?.Choices?.FirstOrDefault()?.Message?.Content;
                    if (string.IsNullOrWhiteSpace(content))
                    {
                        // A 200 with no content is not retryable in any useful sense — the request
                        // was accepted and the model simply said nothing.
                        _logger.LogError("DeepSeek returned a success status with an empty completion.");
                        throw new AiProviderException(
                            AiErrorCodes.ModelOutputInvalid,
                            "The quiz generator returned an empty reply.");
                    }

                    var usage = new AiTokenUsage(
                        payload?.Usage?.PromptTokens ?? 0,
                        payload?.Usage?.CompletionTokens ?? 0);

                    return new AiProviderResult(content, usage);
                }
                catch (OperationCanceledException) when (!ct.IsCancellationRequested)
                {
                    // Our budget expired, not the caller's — the distinction the linked token buys us.
                    if (attempt < MaxAttempts)
                    {
                        _logger.LogWarning("DeepSeek timed out after {Seconds}s on attempt {Attempt}; retrying.",
                            _options.TimeoutSeconds, attempt);
                        continue;
                    }

                    throw new AiProviderException(
                        AiErrorCodes.ProviderTimeout,
                        "The quiz generator took too long to respond. Please try again.");
                }
                catch (HttpRequestException ex)
                {
                    if (attempt < MaxAttempts)
                    {
                        _logger.LogWarning(ex, "DeepSeek transport error on attempt {Attempt}; retrying.", attempt);
                        await Task.Delay(RetryDelay, ct);
                        continue;
                    }

                    throw new AiProviderException(
                        AiErrorCodes.ProviderUnavailable,
                        "Couldn't reach the quiz generator. Please try again in a moment.",
                        ex);
                }
                catch (JsonException ex)
                {
                    // The envelope itself was not JSON — a proxy error page, most likely.
                    throw new AiProviderException(
                        AiErrorCodes.ProviderUnavailable,
                        "The quiz generator returned an unexpected response.",
                        ex);
                }
            }
        }

        /// <summary>
        /// 429 and 5xx are transient. 400/401/403 are our fault (bad request, bad or revoked key)
        /// and retrying them just burns the user's time and doubles the log noise.
        /// </summary>
        private static bool IsRetryable(HttpStatusCode status) =>
            status == HttpStatusCode.TooManyRequests || (int)status >= 500;

        private static async Task<string> SafeReadAsync(HttpResponseMessage response, CancellationToken ct)
        {
            try
            {
                var text = await response.Content.ReadAsStringAsync(ct);
                return text.Length > 500 ? text[..500] : text;
            }
            catch
            {
                return "<unreadable response body>";
            }
        }

        // ── Wire types. Kept private: nothing outside this adapter should shape itself around
        // one provider's payload. Property names are snake_case on the wire, hence the attributes.

        private sealed class ChatRequest
        {
            [JsonPropertyName("model")] public string Model { get; init; } = string.Empty;
            [JsonPropertyName("messages")] public IReadOnlyList<ChatMessage> Messages { get; init; } = Array.Empty<ChatMessage>();
            [JsonPropertyName("temperature")] public double Temperature { get; init; }
            [JsonPropertyName("stream")] public bool Stream { get; init; }
            [JsonPropertyName("max_tokens")] public int MaxTokens { get; init; }
            [JsonPropertyName("response_format")] public ResponseFormat? ResponseFormat { get; init; }
        }

        private sealed record ChatMessage(
            [property: JsonPropertyName("role")] string Role,
            [property: JsonPropertyName("content")] string Content);

        private sealed record ResponseFormat(
            [property: JsonPropertyName("type")] string Type);

        private sealed class ChatResponse
        {
            [JsonPropertyName("choices")] public List<Choice>? Choices { get; init; }
            [JsonPropertyName("usage")] public UsageBlock? Usage { get; init; }
        }

        private sealed class Choice
        {
            [JsonPropertyName("message")] public ChatMessage? Message { get; init; }
            [JsonPropertyName("finish_reason")] public string? FinishReason { get; init; }
        }

        private sealed class UsageBlock
        {
            [JsonPropertyName("prompt_tokens")] public int PromptTokens { get; init; }
            [JsonPropertyName("completion_tokens")] public int CompletionTokens { get; init; }
        }
    }
}
