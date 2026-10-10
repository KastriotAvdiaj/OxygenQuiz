using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Billing
{
    /// <summary>Whether a webhook's source address is one of Paddle's own.</summary>
    public interface IPaddleIpAllowlist
    {
        Task<bool> IsAllowedAsync(string? clientIp, CancellationToken ct = default);
    }

    /// <summary>
    /// Paddle publishes the addresses its webhooks come from at <c>/ips</c> (no auth, one list per
    /// environment). That endpoint is the source of truth and can change, so the list is fetched
    /// and cached here, never written down.
    ///
    /// A second gate in front of <see cref="PaddleSignatureVerifier"/>, not a replacement for it.
    /// That decides the one awkward case: when the list has never been fetched (Paddle's API is
    /// unreachable at the first delivery after a boot) the request is let through to the signature
    /// check instead of refused. Refusing would turn an outage of a convenience endpoint into
    /// dropped webhooks; the signature still has to verify either way.
    /// </summary>
    public sealed class PaddleIpAllowlist : IPaddleIpAllowlist
    {
        public const string HttpClientName = "paddle-ips";

        private static readonly TimeSpan MaxAge = TimeSpan.FromHours(1);
        // An address that isn't on the list may mean Paddle just added one. Re-fetch before
        // refusing, but no more often than this, so a prober can't make us hammer Paddle's API.
        private static readonly TimeSpan MinRefetchInterval = TimeSpan.FromMinutes(5);

        private readonly IHttpClientFactory _http;
        private readonly IOptions<BillingOptions> _options;
        private readonly TimeProvider _clock;
        private readonly ILogger<PaddleIpAllowlist> _logger;
        private readonly SemaphoreSlim _refresh = new(1, 1);

        private IReadOnlyList<IPNetwork>? _networks;
        private DateTimeOffset _lastAttempt = DateTimeOffset.MinValue;

        public PaddleIpAllowlist(
            IHttpClientFactory http, IOptions<BillingOptions> options, TimeProvider clock, ILogger<PaddleIpAllowlist> logger)
        {
            _http = http;
            _options = options;
            _clock = clock;
            _logger = logger;
        }

        public async Task<bool> IsAllowedAsync(string? clientIp, CancellationToken ct = default)
        {
            if (!_options.Value.VerifyWebhookSourceIp)
                return true;

            if (_networks is null || _clock.GetUtcNow() - _lastAttempt > MaxAge)
                await RefreshAsync(ct);

            if (_networks is null)
            {
                _logger.LogWarning("[Billing] Paddle's IP list is unavailable; relying on the webhook signature alone.");
                return true;
            }

            if (!IPAddress.TryParse(clientIp, out var address))
                return false;
            if (address.IsIPv4MappedToIPv6)
                address = address.MapToIPv4();

            if (Contains(address))
                return true;

            if (_clock.GetUtcNow() - _lastAttempt > MinRefetchInterval)
            {
                await RefreshAsync(ct);
                if (Contains(address))
                    return true;
            }

            _logger.LogWarning("[Billing] Refused a Paddle webhook from {ClientIp}: not one of Paddle's addresses.", clientIp);
            return false;
        }

        private bool Contains(IPAddress address) => _networks!.Any(n => n.Contains(address));

        /// <summary>A failed fetch keeps the previous list: a stale list beats none.</summary>
        private async Task RefreshAsync(CancellationToken ct)
        {
            await _refresh.WaitAsync(ct);
            try
            {
                var now = _clock.GetUtcNow();
                if (_networks is not null && now - _lastAttempt <= MinRefetchInterval)
                    return; // another request refreshed while this one waited

                _lastAttempt = now;
                var baseUrl = _options.Value.Environment == "production"
                    ? "https://api.paddle.com/"
                    : "https://sandbox-api.paddle.com/";

                using var response = await _http.CreateClient(HttpClientName).GetAsync(baseUrl + "ips", ct);
                response.EnsureSuccessStatusCode();

                using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                var networks = json.RootElement.GetProperty("data").GetProperty("ipv4_cidrs")
                    .EnumerateArray()
                    .Select(c => IPNetwork.Parse(c.GetString()!))
                    .ToList();

                if (networks.Count > 0)
                    _networks = networks;
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                _logger.LogError(ex, "[Billing] Could not fetch Paddle's IP list; keeping the previous one.");
            }
            finally
            {
                _refresh.Release();
            }
        }
    }
}
