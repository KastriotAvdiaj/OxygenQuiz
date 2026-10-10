using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// Talks to Paddle's REST API (docs/proposals/paid-plans-and-payments.md §5.8). Registered with
    /// a typed <see cref="HttpClient"/> whose base address and bearer token come from
    /// <c>Program.cs</c> (sandbox vs production, per <see cref="BillingOptions.Environment"/>).
    ///
    /// <para><b>Checkout resolves a Paddle customer by email first.</b> Paddle's transaction create
    /// endpoint takes a <c>customer_id</c>, not a raw email — so this finds-or-creates the Paddle
    /// customer, then opens the transaction against it with <c>custom_data.userId</c> set to the
    /// caller's own id from the JWT (never the browser), per §5.4.</para>
    ///
    /// <para><b><see cref="ProviderSubscription.Plan"/>/<see cref="ProviderSubscription.Interval"/>
    /// are derived from the subscription's price id</b> against <see cref="BillingOptions.Prices"/>
    /// — the one place that mapping exists, so <see cref="SubscriptionSyncService"/> never has to
    /// know a Paddle price id from a hole in the ground.</para>
    /// </summary>
    public sealed class PaddleBillingProvider : IBillingProvider
    {
        private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

        private readonly HttpClient _http;
        private readonly BillingOptions _options;
        private readonly ILogger<PaddleBillingProvider> _logger;

        public PaddleBillingProvider(HttpClient http, IOptions<BillingOptions> options, ILogger<PaddleBillingProvider> logger)
        {
            _http = http;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<string> CreateCheckoutTransactionAsync(Guid userId, string userEmail, string priceId, CancellationToken ct = default)
        {
            var customerId = await FindOrCreateCustomerAsync(userEmail, ct);

            var payload = new
            {
                customer_id = customerId,
                items = new[] { new { price_id = priceId, quantity = 1 } },
                custom_data = new { userId = userId.ToString() },
            };

            var envelope = await SendAsync<PaddleEnvelope<PaddleIdOnly>>(HttpMethod.Post, "transactions", payload, ct);
            return envelope.Data.Id;
        }

        public async Task<string> CreatePortalSessionAsync(string customerId, CancellationToken ct = default)
        {
            var envelope = await SendAsync<PaddleEnvelope<PaddlePortalSession>>(
                HttpMethod.Post, $"customers/{customerId}/portal-sessions", new { }, ct);
            return envelope.Data.Urls.General.Overview;
        }

        public async Task<ProviderSubscription> GetSubscriptionAsync(string subscriptionId, CancellationToken ct = default)
        {
            var envelope = await SendAsync<PaddleEnvelope<PaddleSubscription>>(
                HttpMethod.Get, $"subscriptions/{subscriptionId}", null, ct);
            var sub = envelope.Data;

            var priceId = sub.Items.FirstOrDefault()?.Price?.Id
                ?? throw new BillingProviderException($"Paddle subscription {subscriptionId} has no price on its items.");
            var (plan, interval) = ResolvePlan(priceId);

            var userId = ReadUserId(sub.CustomData)
                ?? throw new BillingProviderException($"Paddle subscription {subscriptionId} has no custom_data.userId.");

            return new ProviderSubscription(
                SubscriptionId: sub.Id,
                CustomerId: sub.CustomerId,
                PriceId: priceId,
                UserId: userId,
                Plan: plan,
                Status: ParseStatus(sub.Status),
                Interval: interval,
                CurrentPeriodEnd: sub.CurrentBillingPeriod?.EndsAt,
                CancelAtPeriodEnd: sub.ScheduledChange?.Action == "cancel");
        }

        private async Task<string> FindOrCreateCustomerAsync(string email, CancellationToken ct)
        {
            var found = await SendAsync<PaddleEnvelope<List<PaddleIdOnly>>>(
                HttpMethod.Get, $"customers?email={Uri.EscapeDataString(email)}", null, ct);
            if (found.Data.Count > 0) return found.Data[0].Id;

            var created = await SendAsync<PaddleEnvelope<PaddleIdOnly>>(
                HttpMethod.Post, "customers", new { email }, ct);
            return created.Data.Id;
        }

        private (PlanTier, BillingInterval) ResolvePlan(string priceId) =>
            BillingPriceCatalog.TryResolve(_options.Prices, priceId, out var plan, out var interval)
                ? (plan, interval)
                : throw new BillingProviderException($"Price {priceId} does not match any configured Billing:Prices entry.");

        private static SubscriptionStatus ParseStatus(string status) => status switch
        {
            "active" => SubscriptionStatus.Active,
            "trialing" => SubscriptionStatus.Trialing,
            "past_due" => SubscriptionStatus.PastDue,
            "paused" => SubscriptionStatus.Paused,
            "canceled" => SubscriptionStatus.Canceled,
            _ => throw new BillingProviderException($"Unrecognised Paddle subscription status '{status}'."),
        };

        private static Guid? ReadUserId(JsonElement? customData)
        {
            if (customData is not JsonElement el || el.ValueKind != JsonValueKind.Object) return null;
            if (!el.TryGetProperty("userId", out var userIdEl)) return null;
            return Guid.TryParse(userIdEl.GetString(), out var id) ? id : null;
        }

        private async Task<T> SendAsync<T>(HttpMethod method, string path, object? body, CancellationToken ct)
        {
            using var request = new HttpRequestMessage(method, path);
            if (body is not null)
                request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            using var response = await _http.SendAsync(request, ct);
            var raw = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[Billing] Paddle {Method} {Path} returned {Status}: {Body}", method, path, (int)response.StatusCode, raw);
                throw new BillingProviderException($"Paddle API call failed ({(int)response.StatusCode}).");
            }

            return JsonSerializer.Deserialize<T>(raw, Json)
                ?? throw new BillingProviderException($"Paddle API returned an empty body for {method} {path}.");
        }

        // --- Wire shapes. Paddle's own JSON, not our API contract — kept private to this file. ---

        private sealed class PaddleEnvelope<T>
        {
            [JsonPropertyName("data")]
            public T Data { get; set; } = default!;
        }

        private sealed class PaddleIdOnly
        {
            [JsonPropertyName("id")]
            public string Id { get; set; } = "";
        }

        private sealed class PaddlePortalSession
        {
            [JsonPropertyName("urls")]
            public PaddlePortalUrls Urls { get; set; } = new();
        }

        private sealed class PaddlePortalUrls
        {
            [JsonPropertyName("general")]
            public PaddlePortalGeneral General { get; set; } = new();
        }

        private sealed class PaddlePortalGeneral
        {
            [JsonPropertyName("overview")]
            public string Overview { get; set; } = "";
        }

        private sealed class PaddleSubscription
        {
            [JsonPropertyName("id")]
            public string Id { get; set; } = "";

            [JsonPropertyName("status")]
            public string Status { get; set; } = "";

            [JsonPropertyName("customer_id")]
            public string? CustomerId { get; set; }

            [JsonPropertyName("items")]
            public List<PaddleSubscriptionItem> Items { get; set; } = [];

            [JsonPropertyName("current_billing_period")]
            public PaddleBillingPeriod? CurrentBillingPeriod { get; set; }

            [JsonPropertyName("scheduled_change")]
            public PaddleScheduledChange? ScheduledChange { get; set; }

            [JsonPropertyName("custom_data")]
            public JsonElement? CustomData { get; set; }
        }

        private sealed class PaddleSubscriptionItem
        {
            [JsonPropertyName("price")]
            public PaddleIdOnly? Price { get; set; }
        }

        private sealed class PaddleBillingPeriod
        {
            [JsonPropertyName("ends_at")]
            public DateTime EndsAt { get; set; }
        }

        private sealed class PaddleScheduledChange
        {
            [JsonPropertyName("action")]
            public string Action { get; set; } = "";
        }
    }
}
