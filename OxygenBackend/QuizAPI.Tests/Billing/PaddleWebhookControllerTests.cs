using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using QuizAPI.Controllers.Billing;
using QuizAPI.Data;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Billing;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Billing;

/// <summary>
/// The first raw-body endpoint in this codebase. A bad signature must write nothing and return a
/// bare 401; a duplicate delivery after success is a no-op; a failed sync leaves the event
/// retryable (docs/proposals/paid-plans-and-payments.md §5.5).
/// </summary>
public class PaddleWebhookControllerTests
{
    private const string Secret = "whsec_test_secret";
    private static readonly DateTimeOffset Now = new(2026, 10, 10, 12, 0, 0, TimeSpan.Zero);

    private sealed class World
    {
        private readonly string _db = Guid.NewGuid().ToString();
        public readonly Mock<ISubscriptionSyncService> Sync = new();
        public readonly FakeTimeProvider Clock = new(Now);

        public async Task<IActionResult> Post(string body, string? signatureHeader)
        {
            await using var ctx = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db).Options, new TestCurrentUserService());
            var events = new BillingWebhookEventRepository(ctx);

            var controller = new PaddleWebhookController(
                events, Sync.Object, Options.Create(new PaddleWebhookOptions { Secret = Secret }), Clock,
                NullLogger<PaddleWebhookController>.Instance);

            var httpContext = new DefaultHttpContext();
            httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
            if (signatureHeader is not null)
                httpContext.Request.Headers["Paddle-Signature"] = signatureHeader;
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            return await controller.Handle(CancellationToken.None);
        }

        public async Task<BillingWebhookEventRepository> Events()
        {
            var ctx = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db).Options, new TestCurrentUserService());
            return new BillingWebhookEventRepository(ctx);
        }
    }

    private static string ValidHeader(string body) =>
        PaddleTestSignatures.Header(Now.ToUnixTimeSeconds().ToString(), body, Secret);

    private static string SubscriptionEventBody(string eventId, string subscriptionId, string eventType = "subscription.updated") =>
        "{\"event_id\":\"" + eventId + "\",\"event_type\":\"" + eventType + "\"," +
        "\"occurred_at\":\"2026-10-10T12:00:00Z\",\"data\":{\"id\":\"" + subscriptionId + "\"}}";

    private static string TransactionEventBodyWithNoSubscription(string eventId) =>
        "{\"event_id\":\"" + eventId + "\",\"event_type\":\"transaction.completed\"," +
        "\"occurred_at\":\"2026-10-10T12:00:00Z\",\"data\":{\"id\":\"txn_1\"}}";

    [Fact]
    public async Task A_bad_signature_is_a_401_and_writes_no_event_row()
    {
        var w = new World();
        var body = SubscriptionEventBody("evt_bad", "sub_1");

        var result = await w.Post(body, "ts=1;h1=deadbeef");

        Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status401Unauthorized, ((StatusCodeResult)result).StatusCode);
        w.Sync.Verify(s => s.SyncAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Null(await (await w.Events()).GetAsync("evt_bad"));
    }

    [Fact]
    public async Task A_valid_subscription_event_syncs_and_marks_the_event_processed()
    {
        var w = new World();
        var body = SubscriptionEventBody("evt_1", "sub_1");
        w.Sync.Setup(s => s.SyncAsync("sub_1", It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await w.Post(body, ValidHeader(body));

        Assert.IsType<OkResult>(result);
        w.Sync.Verify(s => s.SyncAsync("sub_1", It.IsAny<CancellationToken>()), Times.Once);
        var evt = await (await w.Events()).GetAsync("evt_1");
        Assert.NotNull(evt);
        Assert.NotNull(evt!.ProcessedAt);
    }

    [Fact]
    public async Task A_duplicate_delivery_after_success_does_not_sync_again()
    {
        var w = new World();
        var body = SubscriptionEventBody("evt_2", "sub_2");
        w.Sync.Setup(s => s.SyncAsync("sub_2", It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await w.Post(body, ValidHeader(body));
        var second = await w.Post(body, ValidHeader(body));

        Assert.IsType<OkResult>(second);
        w.Sync.Verify(s => s.SyncAsync("sub_2", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_failed_sync_leaves_the_event_unprocessed_and_returns_500_so_Paddle_retries()
    {
        var w = new World();
        var body = SubscriptionEventBody("evt_3", "sub_3");
        w.Sync.Setup(s => s.SyncAsync("sub_3", It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("boom"));

        var result = await w.Post(body, ValidHeader(body));

        Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, ((StatusCodeResult)result).StatusCode);
        var evt = await (await w.Events()).GetAsync("evt_3");
        Assert.NotNull(evt);
        Assert.Null(evt!.ProcessedAt);
        Assert.Equal("boom", evt.Error);
    }

    [Fact]
    public async Task A_retried_delivery_after_a_failure_tries_the_sync_again()
    {
        var w = new World();
        var body = SubscriptionEventBody("evt_4", "sub_4");
        w.Sync.Setup(s => s.SyncAsync("sub_4", It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("boom"));

        await w.Post(body, ValidHeader(body)); // fails, stays unprocessed

        w.Sync.Setup(s => s.SyncAsync("sub_4", It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var result = await w.Post(body, ValidHeader(body)); // Paddle's retry of the same event_id

        Assert.IsType<OkResult>(result);
        w.Sync.Verify(s => s.SyncAsync("sub_4", It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task A_non_subscription_bearing_event_is_acknowledged_without_syncing()
    {
        var w = new World();
        var body = TransactionEventBodyWithNoSubscription("evt_5");

        var result = await w.Post(body, ValidHeader(body));

        Assert.IsType<OkResult>(result);
        w.Sync.Verify(s => s.SyncAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        var evt = await (await w.Events()).GetAsync("evt_5");
        Assert.NotNull(evt!.ProcessedAt);
    }
}
