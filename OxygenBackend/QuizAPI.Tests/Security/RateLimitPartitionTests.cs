using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using QuizAPI.Hubs;
using QuizAPI.Middleware;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// Which bucket a request lands in. The limiter's numbers are configuration; the partition is the
/// part that has been wrong — a hub missing from a path list, a classroom sharing one IP, and an IP
/// a caller could choose by sending a header. See docs/development/rate-limiting.md.
/// </summary>
public class RateLimitPartitionTests
{
    private static DefaultHttpContext Request(string remoteIp = "203.0.113.7", string? userId = null)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);
        if (userId is not null)
        {
            context.User = new ClaimsPrincipal(new ClaimsIdentity(
                new[] { new Claim(ClaimTypes.NameIdentifier, userId) }, authenticationType: "Bearer"));
        }
        return context;
    }

    [Fact]
    public void A_signed_in_request_is_counted_for_its_user_not_its_ip()
    {
        // Two students in one school: same public IP, different accounts, different buckets.
        var a = RateLimitingExtensions.GlobalPartitionKey(Request("198.51.100.1", userId: "a"));
        var b = RateLimitingExtensions.GlobalPartitionKey(Request("198.51.100.1", userId: "b"));

        Assert.Equal("user:a", a);
        Assert.Equal("user:b", b);
    }

    [Fact]
    public void An_anonymous_request_is_counted_for_its_ip()
    {
        Assert.Equal("ip:198.51.100.1", RateLimitingExtensions.GlobalPartitionKey(Request("198.51.100.1")));
    }

    [Theory]
    [InlineData("CF-Connecting-IP")]
    [InlineData("X-Forwarded-For")]
    [InlineData("X-Real-IP")]
    public void A_client_ip_header_cannot_choose_the_bucket(string header)
    {
        // The bypass this closes: a caller reaching the origin directly sent a fresh header per
        // request and got a fresh bucket each time. Only the connection address counts; nginx is
        // what puts the visitor's address there (ADR 0027).
        var context = Request("198.51.100.1");
        context.Request.Headers[header] = "192.0.2.99";

        Assert.Equal("198.51.100.1", RateLimitingExtensions.ClientIp(context));
        Assert.Equal("ip:198.51.100.1", RateLimitingExtensions.GlobalPartitionKey(context));
    }

    private static DefaultHttpContext HubRequest(string path)
    {
        var context = Request();
        context.Request.Path = path;
        context.SetEndpoint(new Endpoint(
            requestDelegate: null,
            metadata: new EndpointMetadataCollection(new HubMetadata(typeof(HostedGameHub))),
            displayName: "hub"));
        return context;
    }

    [Fact]
    public void A_hub_connection_is_exempt()
    {
        Assert.Null(RateLimitingExtensions.GlobalPartitionKey(HubRequest("/hostedGameHub")));
    }

    [Fact]
    public void A_hub_negotiate_is_still_counted()
    {
        // One per new connection, and the only cap on opening connections — which is what bounds
        // Screen-code guessing, since a Display gets a fixed number of guesses per connection.
        Assert.Equal("ip:203.0.113.7",
            RateLimitingExtensions.GlobalPartitionKey(HubRequest("/hostedGameHub/negotiate")));
    }

    [Fact]
    public void A_plain_endpoint_is_not_exempt()
    {
        var context = Request();
        context.SetEndpoint(new Endpoint(null, EndpointMetadataCollection.Empty, "controller"));

        Assert.NotNull(RateLimitingExtensions.GlobalPartitionKey(context));
    }

    [Theory]
    [InlineData(typeof(QuizHub), "/quizHub")]
    [InlineData(typeof(NotificationHub), "/notificationHub")]
    [InlineData(typeof(HostedGameHub), "/hostedGameHub")]
    public void MapHub_tags_every_endpoint_it_maps_including_negotiate(Type hub, string path)
    {
        // The exemption keys on HubMetadata. This pins the framework behaviour it relies on: if
        // negotiate were untagged, every connection attempt would still count against the limit.
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddSignalR();
        var app = builder.Build();

        var mapHub = typeof(HubEndpointRouteBuilderExtensions)
            .GetMethods()
            .Single(m => m.Name == nameof(HubEndpointRouteBuilderExtensions.MapHub)
                         && m.GetParameters().Length == 2)
            .MakeGenericMethod(hub);
        mapHub.Invoke(null, new object[] { app, path });

        var endpoints = ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(d => d.Endpoints)
            .OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText!.StartsWith(path.TrimStart('/'), StringComparison.OrdinalIgnoreCase)
                        || e.RoutePattern.RawText!.StartsWith(path, StringComparison.OrdinalIgnoreCase))
            .ToList();

        Assert.Contains(endpoints, e => e.RoutePattern.RawText!.Contains("negotiate"));
        Assert.All(endpoints, e => Assert.NotNull(e.Metadata.GetMetadata<HubMetadata>()));
    }
}
