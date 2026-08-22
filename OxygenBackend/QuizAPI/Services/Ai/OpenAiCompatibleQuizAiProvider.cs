using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// A client for any vendor that speaks the <b>OpenAI ChatCompletions wire format</b> — the
    /// de-facto standard shape for this call: <c>POST {BaseUrl}/chat/completions</c> carrying
    /// <c>model</c>, <c>messages</c>, <c>temperature</c>, <c>max_tokens</c> and
    /// <c>response_format</c>, answering with <c>choices[0].message.content</c> and a
    /// <c>usage</c> block. Nothing here talks to OpenAI and no OpenAI account is involved — the
    /// format carries their name only because they published it first.
    ///
    /// <para><b>Which vendor and which model is configuration, not code:</b>
    /// <c>Ai:BaseUrl</c>, <c>Ai:Model</c>, <c>Ai:ApiKey</c>, and the two cost-per-million
    /// values that price the result. This class was <c>DeepSeekQuizAiProvider</c> until
    /// 2026-08-22; it was renamed because the name implied a coupling that never existed, and a
    /// vendor name in a class name is a lie the moment <c>Ai:BaseUrl</c> points elsewhere.
    /// Known compatible: DeepSeek (<c>https://api.deepseek.com</c>) and Alibaba's Qwen
    /// "compatible-mode" endpoint. The vendor actually in use is recorded on every usage row
    /// (<c>AiGenerationUsage.Model</c>), named in every log line below, and shown in the wizard
    /// via <c>GET /quiz/ai-quota</c> — so "which model made this" is answerable from the data,
    /// not from whatever a class is called.</para>
    ///
    /// <para>Two details of the format worth knowing, both true of DeepSeek and Qwen alike:
    /// JSON mode is <c>response_format: { "type": "json_object" }</c> and it <b>requires the
    /// word "json" to appear in the prompt</b> — <see cref="AiPromptBuilder"/> guarantees that,
    /// and this class asserts it rather than letting the vendor 400 mysteriously; and JSON mode
    /// guarantees syntactic validity, not our schema. Neither vendor supports OpenAI's strict
    /// <c>json_schema</c> on the stable endpoint, so semantic validation stays where it already
    /// lives (plan §5.2).</para>
    ///
    /// <para><b>Before pointing this at a new vendor</b>, check three things with a raw curl:
    /// that <c>response_format: json_object</c> is accepted; that the reply arrives in
    /// <c>choices[0].message.content</c>; and that <c>usage</c> reports
    /// <c>prompt_tokens</c> / <c>completion_tokens</c> — the cost ledger records zero,
    /// silently, if that block is missing or named differently. A vendor needing an extra body
    /// field (a non-thinking-mode toggle, say) needs a line in <c>ChatRequest</c>, and that is
    /// the real boundary of "config only".</para>
    /// </summary>
    public sealed class OpenAiCompatibleQuizAiProvider : IQuizAiProvider
    {
        private readonly HttpClient _http;
        private readonly AiOptions _options;
        private readonly ILogger<OpenAiCompatibleQuizAiProvider> _logger;

        /// <summary>One retry only. A second failure is a real outage, and the user is waiting.</summary>
        private const int MaxAttempts = 2;
        private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(2);

        private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

        public OpenAiCompatibleQuizAiProvider(
            HttpClient http,
            IOptions<AiOptions> options,
            ILogger<OpenAiCompatibleQuizAiProvider> logger)
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
                    "JSON mode requires the word \"json\" in the prompt, and this prompt does not contain it.");

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

                        // Checked before the retry decision: a rate limit is neither an outage nor
                        // something a two-second retry fixes, and it needs different advice.
                        if (IsUpstreamRateLimit(response.StatusCode, detail))
                        {
                            _logger.LogError(
                                "AI provider {Model} refused the request as over its rate limit ({Status}). If the " +
                                "message says a single request exceeds the limit, the cause is Ai:MaxOutputTokens " +
                                "({MaxOutputTokens}) at or above the vendor's per-minute token allowance — vendors " +
                                "reserve max_tokens up front, so the call can never fit and waiting will not help. " +
                                "{Detail}",
                                _options.Model, (int)response.StatusCode, _options.MaxOutputTokens, detail);

                            throw new AiProviderException(
                                AiErrorCodes.ProviderUnavailable,
                                "The quiz generator is over its rate limit. Wait a minute and try again, or ask for fewer questions.");
                        }

                        if (IsRetryable(response.StatusCode) && attempt < MaxAttempts)
                        {
                            _logger.LogWarning(
                                "AI provider {Model} returned {Status} on attempt {Attempt}; retrying. {Detail}",
                                _options.Model, (int)response.StatusCode, attempt, detail);
                            await Task.Delay(RetryDelay, ct);
                            continue;
                        }

                        // Log the upstream detail; never hand it to the user — it can echo the
                        // prompt back, and the prompt can contain their source material.
                        _logger.LogError(
                            "AI provider {Model} at {BaseUrl} failed with {Status} after {Attempt} attempt(s). {Detail}",
                            _options.Model, _options.BaseUrl, (int)response.StatusCode, attempt, detail);

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
                        _logger.LogError(
                            "AI provider {Model} returned a success status with an empty completion.",
                            _options.Model);
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
                        _logger.LogWarning(
                            "AI provider {Model} timed out after {Seconds}s on attempt {Attempt}; retrying.",
                            _options.Model, _options.TimeoutSeconds, attempt);
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
                        _logger.LogWarning(ex,
                            "AI provider {Model} transport error on attempt {Attempt}; retrying.",
                            _options.Model, attempt);
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
        ///
        /// <para>Rate limits are handled before this is consulted — see
        /// <see cref="IsUpstreamRateLimit"/>.</para>
        /// </summary>
        private static bool IsRetryable(HttpStatusCode status) =>
            status == HttpStatusCode.TooManyRequests || (int)status >= 500;

        /// <summary>
        /// <b>Vendors disagree about which status code a rate limit is.</b> OpenAI and DeepSeek
        /// answer 429; Groq answers <b>413 Payload Too Large</b> with <c>code:
        /// "rate_limit_exceeded"</c> when a request exceeds the tokens-per-minute allowance. So the
        /// status alone can't classify it, and the body has to be read — which we already do, for
        /// the log.
        ///
        /// <para><b>Why this is not simply added to <see cref="IsRetryable"/>:</b> our retry is one
        /// attempt, two seconds later, with the user watching. A per-minute token budget does not
        /// refill in two seconds, and in the case that actually bit us it never refills at all — a
        /// single request asking for 8,886 tokens against an 8,000/minute ceiling is over the limit
        /// on its own, forever, because vendors reserve <c>max_tokens</c> up front whether the model
        /// uses them or not. Retrying that burns two seconds of someone's attention to fail
        /// identically. The honest answer is to say what happened and let them decide.</para>
        ///
        /// <para>The error code stays <c>ProviderUnavailable</c> rather than gaining a
        /// <c>ProviderRateLimited</c> sibling: the client does the same thing either way — show the
        /// message, offer retry, keep the copy-paste path — and the closed code set is a contract
        /// across four files (see AiGenerationContracts). A distinct message carries the difference
        /// the user can act on; a distinct code would only carry it to code that ignores it.</para>
        /// </summary>
        private static bool IsUpstreamRateLimit(HttpStatusCode status, string detail) =>
            status == HttpStatusCode.RequestEntityTooLarge &&
            detail.Contains("rate_limit_exceeded", StringComparison.OrdinalIgnoreCase);

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
        // one vendor's payload. Property names are snake_case on the wire, hence the attributes.
        // These are the standard ChatCompletions fields and nothing else: a vendor-specific field
        // added here is the moment this class stops being generic, so add one deliberately.

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
