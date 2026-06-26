using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace QuizAPI.Middleware
{
    /// <summary>
    /// Application-level rate limiting (defense-in-depth behind Cloudflare). See docs/rate-limiting.md
    /// for the why, the tuning, and how it fits with the edge layer.
    ///
    /// Two things to know when reading this:
    ///  - Partition keys use the *real* client IP (<see cref="ClientIp"/>), read from Cloudflare's
    ///    <c>CF-Connecting-IP</c> header — without that we'd partition on Cloudflare's edge IPs and
    ///    throttle every user as if they were one.
    ///  - The persistent SignalR hubs are exempt from the global limiter; rate-limiting a long-lived
    ///    WebSocket connection makes no sense and would break multiplayer.
    /// </summary>
    public static class RateLimitingExtensions
    {
        /// <summary>Strict per-IP limit for credential / token endpoints (brute-force surface).</summary>
        public const string AuthPolicy = "auth";

        /// <summary>Per-IP limit for anonymous guest-session creation (abuse surface).</summary>
        public const string GuestPolicy = "guest";

        public static IServiceCollection AddOxygenRateLimiting(this IServiceCollection services)
        {
            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                // Safety-net cap on every request from a single client. Generous on purpose — normal
                // quiz play (loading questions, submitting answers) must never trip it; this only
                // catches a single source hammering the API. Cloudflare handles real volumetric DDoS.
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                {
                    var path = httpContext.Request.Path;

                    // Never throttle the persistent SignalR connections.
                    if (path.StartsWithSegments("/quizHub") || path.StartsWithSegments("/notificationHub"))
                        return RateLimitPartition.GetNoLimiter("signalr-hub");

                    return RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: ClientIp(httpContext),
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 100,                  // ~10 req/s sustained per client
                            Window = TimeSpan.FromSeconds(10),
                            SegmentsPerWindow = 5,
                            QueueLimit = 0,                      // reject immediately, don't queue
                        });
                });

                // Tight limit for login / signup / refresh / email-token endpoints.
                options.AddPolicy(AuthPolicy, httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: ClientIp(httpContext),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 10,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                        }));

                // Guest-session creation. The one-free-quiz cookie already limits honest users;
                // this stops a script from spamming new guest sessions to churn the DB.
                options.AddPolicy(GuestPolicy, httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: ClientIp(httpContext),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 20,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                        }));

                // On rejection: surface a clean 429 + Retry-After so clients can back off politely.
                options.OnRejected = async (context, cancellationToken) =>
                {
                    context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;

                    if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    {
                        context.HttpContext.Response.Headers.RetryAfter =
                            ((int)retryAfter.TotalSeconds).ToString(NumberFormatInfo.InvariantInfo);
                    }

                    await context.HttpContext.Response.WriteAsJsonAsync(new
                    {
                        message = "Too many requests. Please slow down and try again in a moment.",
                        isCustomMessage = true,
                    }, cancellationToken);
                };
            });

            return services;
        }

        /// <summary>
        /// Resolves the real client IP. Prefers Cloudflare's <c>CF-Connecting-IP</c>, then the first
        /// hop of <c>X-Forwarded-For</c>, then the socket address. NOTE: these headers are only
        /// trustworthy when traffic is forced through the proxy (lock the origin's firewall to
        /// Cloudflare IP ranges) — otherwise a caller hitting the origin directly can spoof them.
        /// See docs/rate-limiting.md § "Trusting the client IP".
        /// </summary>
        private static string ClientIp(HttpContext context)
        {
            var cfIp = context.Request.Headers["CF-Connecting-IP"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(cfIp))
                return cfIp;

            var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwardedFor))
                return forwardedFor.Split(',')[0].Trim();

            return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}
