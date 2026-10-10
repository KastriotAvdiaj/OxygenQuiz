using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using QuizAPI.Middleware;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Billing;

namespace QuizAPI.Controllers.Billing
{
    /// <summary>
    /// Paddle's "something changed" ping (docs/proposals/paid-plans-and-payments.md §5.5). Anonymous
    /// because Paddle, not a signed-in user, calls this — the <c>Paddle-Signature</c> header is the
    /// only trust boundary. The first raw-body endpoint in this codebase: model binding never runs,
    /// because the signature covers the exact bytes Paddle sent.
    /// </summary>
    [ApiController]
    [Route("api/billing/webhooks/paddle")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.BillingWebhookPolicy)]
    public class PaddleWebhookController : ControllerBase
    {
        private readonly IBillingWebhookEventRepository _events;
        private readonly ISubscriptionSyncService _sync;
        private readonly IOptions<PaddleWebhookOptions> _secret;
        private readonly TimeProvider _clock;
        private readonly ILogger<PaddleWebhookController> _logger;

        public PaddleWebhookController(
            IBillingWebhookEventRepository events, ISubscriptionSyncService sync,
            IOptions<PaddleWebhookOptions> secret, TimeProvider clock, ILogger<PaddleWebhookController> logger)
        {
            _events = events;
            _sync = sync;
            _secret = secret;
            _clock = clock;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Handle(CancellationToken ct)
        {
            // Defensive: nothing upstream reads the body today, but EnableBuffering costs nothing
            // and protects against a future logging middleware breaking this the first time it does.
            Request.EnableBuffering();

            string rawBody;
            using (var reader = new StreamReader(Request.Body, leaveOpen: true))
                rawBody = await reader.ReadToEndAsync(ct);
            Request.Body.Position = 0;

            var header = Request.Headers["Paddle-Signature"].FirstOrDefault();

            // A bad signature writes nothing and returns a bare 401 — not a thrown exception, which
            // GlobalExceptionHandler would turn into a ProblemDetails body that leaks that something
            // is listening at this path with this shape (§5.5).
            if (!PaddleSignatureVerifier.Verify(header, rawBody, _secret.Value.Secret, TimeSpan.FromMinutes(5), _clock))
                return StatusCode(StatusCodes.Status401Unauthorized);

            PaddleWebhookPayload payload;
            try
            {
                payload = JsonSerializer.Deserialize<PaddleWebhookPayload>(rawBody)
                    ?? throw new JsonException("Empty payload.");
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "[Billing] Paddle webhook body did not parse despite a valid signature.");
                return StatusCode(StatusCodes.Status400BadRequest);
            }

            var eventRow = await _events.GetAsync(payload.EventId, ct);
            if (eventRow?.ProcessedAt is not null)
                return Ok(); // a true duplicate — already handled

            var now = _clock.GetUtcNow().UtcDateTime;
            if (eventRow is null)
            {
                eventRow = new BillingWebhookEvent
                {
                    EventId = payload.EventId,
                    EventType = payload.EventType,
                    OccurredAt = payload.OccurredAt,
                    ReceivedAt = now,
                };
                await _events.AddAsync(eventRow, ct);
                await _events.SaveChangesAsync(ct);
            }

            var subscriptionId = ResolveSubscriptionId(payload);
            if (subscriptionId is null)
            {
                // Not a subscription-bearing event (e.g. a one-time transaction) — nothing to sync.
                eventRow.ProcessedAt = now;
                await _events.SaveChangesAsync(ct);
                return Ok();
            }

            try
            {
                await _sync.SyncAsync(subscriptionId, ct);
                eventRow.ProcessedAt = _clock.GetUtcNow().UtcDateTime;
                eventRow.Error = null;
                await _events.SaveChangesAsync(ct);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Billing] Sync failed for Paddle event {EventId} ({EventType}), subscription {SubscriptionId}",
                    payload.EventId, payload.EventType, subscriptionId);
                eventRow.Error = ex.Message;
                await _events.SaveChangesAsync(ct);
                return StatusCode(StatusCodes.Status500InternalServerError); // Paddle retries
            }
        }

        private static string? ResolveSubscriptionId(PaddleWebhookPayload payload)
        {
            if (payload.EventType.StartsWith("subscription.", StringComparison.Ordinal))
                return payload.Data.TryGetProperty("id", out var id) ? id.GetString() : null;

            if (payload.EventType.StartsWith("transaction.", StringComparison.Ordinal) &&
                payload.Data.TryGetProperty("subscription_id", out var subId) && subId.ValueKind == JsonValueKind.String)
                return subId.GetString();

            return null;
        }

        /// <summary>Paddle's own wire shape — not our API contract, so it stays private to this controller.</summary>
        private sealed class PaddleWebhookPayload
        {
            [JsonPropertyName("event_id")]
            public string EventId { get; set; } = "";

            [JsonPropertyName("event_type")]
            public string EventType { get; set; } = "";

            [JsonPropertyName("occurred_at")]
            public DateTime OccurredAt { get; set; }

            [JsonPropertyName("data")]
            public JsonElement Data { get; set; }
        }
    }
}
