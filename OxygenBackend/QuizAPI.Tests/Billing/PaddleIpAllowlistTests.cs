using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using QuizAPI.Services.Billing;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// The webhook's source-address gate (docs/auth/paid-plans.md §8). Paddle's own <c>/ips</c> is the
/// list; an unreachable list never refuses a delivery on its own, because the signature check
/// still runs behind it.
/// </summary>
public class PaddleIpAllowlistTests
{
    private const string PaddleIp = "34.237.3.244";
    private const string LaterPaddleIp = "52.11.166.252";
    private const string SomeoneElse = "203.0.113.9";

    private sealed class PaddleIps : HttpMessageHandler
    {
        public List<string> Cidrs = [PaddleIp + "/32"];
        public bool Down;
        public int Calls;
        public Uri? LastUri;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++;
            LastUri = request.RequestUri;
            if (Down)
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

            var json = "{\"data\":{\"ipv4_cidrs\":[" + string.Join(",", Cidrs.Select(c => "\"" + c + "\"")) + "]}}";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json) });
        }
    }

    private sealed class World
    {
        public readonly PaddleIps Paddle = new();
        public readonly FakeTimeProvider Clock = new(new DateTimeOffset(2026, 10, 10, 12, 0, 0, TimeSpan.Zero));
        public readonly BillingOptions Options = new() { Enabled = true, Environment = "production" };
        public readonly PaddleIpAllowlist Allowlist;

        public World()
        {
            var http = new Mock<IHttpClientFactory>();
            http.Setup(f => f.CreateClient(PaddleIpAllowlist.HttpClientName))
                .Returns(() => new HttpClient(Paddle, disposeHandler: false));
            Allowlist = new PaddleIpAllowlist(
                http.Object, Microsoft.Extensions.Options.Options.Create(Options), Clock, NullLogger<PaddleIpAllowlist>.Instance);
        }
    }

    [Fact]
    public async Task One_of_Paddles_addresses_is_allowed_and_the_list_is_fetched_once()
    {
        var w = new World();

        Assert.True(await w.Allowlist.IsAllowedAsync(PaddleIp));
        Assert.True(await w.Allowlist.IsAllowedAsync(PaddleIp));

        Assert.Equal(1, w.Paddle.Calls);
        Assert.Equal("https://api.paddle.com/ips", w.Paddle.LastUri!.ToString());
    }

    [Fact]
    public async Task Sandbox_asks_the_sandbox_api_for_its_own_list()
    {
        var w = new World();
        w.Options.Environment = "sandbox";

        await w.Allowlist.IsAllowedAsync(PaddleIp);

        Assert.Equal("https://sandbox-api.paddle.com/ips", w.Paddle.LastUri!.ToString());
    }

    [Theory]
    [InlineData(SomeoneElse)]
    [InlineData("not-an-address")]
    [InlineData(null)]
    public async Task Any_other_address_is_refused(string? clientIp)
    {
        var w = new World();

        Assert.False(await w.Allowlist.IsAllowedAsync(clientIp));
    }

    [Fact]
    public async Task An_IPv4_address_arriving_in_IPv6_form_is_still_recognised()
    {
        var w = new World();

        Assert.True(await w.Allowlist.IsAllowedAsync("::ffff:" + PaddleIp));
    }

    [Fact]
    public async Task With_the_list_never_fetched_the_request_goes_through_to_the_signature_check()
    {
        var w = new World();
        w.Paddle.Down = true;

        Assert.True(await w.Allowlist.IsAllowedAsync(SomeoneElse));
    }

    [Fact]
    public async Task A_failed_refresh_keeps_the_previous_list()
    {
        var w = new World();
        await w.Allowlist.IsAllowedAsync(PaddleIp);

        w.Paddle.Down = true;
        w.Clock.Advance(TimeSpan.FromHours(2));

        Assert.True(await w.Allowlist.IsAllowedAsync(PaddleIp));
        Assert.False(await w.Allowlist.IsAllowedAsync(SomeoneElse));
    }

    [Fact]
    public async Task An_address_Paddle_added_since_the_last_fetch_is_found_by_refetching_before_refusing()
    {
        var w = new World();
        await w.Allowlist.IsAllowedAsync(PaddleIp);

        w.Paddle.Cidrs.Add(LaterPaddleIp + "/32");
        w.Clock.Advance(TimeSpan.FromMinutes(6));

        Assert.True(await w.Allowlist.IsAllowedAsync(LaterPaddleIp));
    }

    [Fact]
    public async Task Unknown_addresses_in_a_burst_do_not_each_refetch_the_list()
    {
        var w = new World();
        await w.Allowlist.IsAllowedAsync(PaddleIp);

        for (var i = 0; i < 5; i++)
            Assert.False(await w.Allowlist.IsAllowedAsync(SomeoneElse));

        Assert.Equal(1, w.Paddle.Calls);
    }

    [Fact]
    public async Task Turned_off_it_allows_everything_and_never_calls_Paddle()
    {
        var w = new World();
        w.Options.VerifyWebhookSourceIp = false;

        Assert.True(await w.Allowlist.IsAllowedAsync(SomeoneElse));
        Assert.Equal(0, w.Paddle.Calls);
    }
}
