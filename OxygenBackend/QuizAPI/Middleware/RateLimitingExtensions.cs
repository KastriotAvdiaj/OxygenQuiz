using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace QuizAPI.Middleware
{
    /// <summary>
    /// Application-level rate limiting (defense-in-depth behind Cloudflare). See docs/development/rate-limiting.md
    /// for the why, the tuning, and how it fits with the edge layer.
    ///
    /// Three things to know when reading this:
    ///  - The client IP is <c>Connection.RemoteIpAddress</c> and nothing else (<see cref="ClientIp"/>).
    ///    Nginx resolves the visitor's address from <c>CF-Connecting-IP</c>, trusting it only from
    ///    Cloudflare's ranges, and hands it on; <c>UseForwardedHeaders</c> applies it. No header is
    ///    read here, so a request can't pick its own bucket. See
    ///    docs/adr/0027-the-client-ip-is-resolved-at-nginx.md.
    ///  - Signed-in traffic is counted per user, anonymous traffic per IP. A school puts a whole class
    ///    behind one address, and per-IP counting throttled the class as one client.
    ///  - Every SignalR hub's connection traffic is exempt from the global limiter (by endpoint
    ///    metadata, so a new hub can't be forgotten); its <c>negotiate</c> request is still counted.
    /// </summary>
    public static class RateLimitingExtensions
    {
        /// <summary>
        /// Per-IP limit for credential / token-guessing endpoints (brute-force surface). Not on
        /// <c>refresh</c>: its token is 256 random bits, nothing to guess, and the SPA calls it on its
        /// own — sharing this budget made a user's background refreshes eat their login attempts.
        /// </summary>
        public const string AuthPolicy = "auth";

        /// <summary>Global cap for a signed-in user, per user, per 10 s.</summary>
        internal const int UserGlobalLimit = 100;

        /// <summary>
        /// Global cap for anonymous traffic, per IP, per 10 s. Higher than the per-user cap because one
        /// IP can be a whole school (NAT): signed-out visitors browsing the catalogue or playing as
        /// guests share it. Floods are Cloudflare's job (layer 1); this only stops one source
        /// hammering the box.
        /// </summary>
        internal const int AnonymousGlobalLimit = 300;

        /// <summary>Per-IP limit for anonymous guest-session creation (abuse surface).</summary>
        public const string GuestPolicy = "guest";

        /// <summary>
        /// AI generation. Costs real money per call and holds a connection for tens of seconds,
        /// so this is tighter than anything else here. It is the burst guard only — the ceiling
        /// on sustained use is the per-user daily quota, which a per-IP limiter cannot express
        /// (see docs/quiz/ai-quiz-generation-plan.md §9.1).
        /// </summary>
        public const string AiPolicy = "ai";

        /// <summary>
        /// Config key that turns every limit here off (<c>false</c>). Missing means on, so a
        /// production box can never lose its limits to a forgotten setting;
        /// <c>appsettings.Development.json</c> sets it to <c>false</c>, because local work (hot
        /// reload, a page refreshed twenty times, running the showcase flows) trips the auth and
        /// global limits constantly. See docs/development/rate-limiting.md § "In development".
        /// </summary>
        public const string EnabledKey = "RateLimiting:Enabled";

        public static IServiceCollection AddOxygenRateLimiting(this IServiceCollection services, IConfiguration configuration)
        {
            var enabled = configuration.GetValue(EnabledKey, defaultValue: true);

            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                if (!enabled)
                {
                    // Off: no global cap, and every named policy still exists (the endpoints ask
                    // for them by name, and an unknown policy name throws) but never limits.
                    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
                        _ => RateLimitPartition.GetNoLimiter("disabled"));
                    foreach (var policy in new[] { AuthPolicy, GuestPolicy, AiPolicy })
                        options.AddPolicy(policy, _ => RateLimitPartition.GetNoLimiter("disabled"));
                    return;
                }

                // Safety-net cap on every request from a single client. Generous on purpose — normal
                // quiz play (loading questions, submitting answers) must never trip it; this only
                // catches a single source hammering the API. Cloudflare handles real volumetric DDoS.
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                {
                    var key = GlobalPartitionKey(httpContext);
                    if (key is null)
                        return RateLimitPartition.GetNoLimiter("signalr-hub");

                    var limit = key.StartsWith("user:", StringComparison.Ordinal)
                        ? UserGlobalLimit
                        : AnonymousGlobalLimit;

                    return RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: key,
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = limit,
                            Window = TimeSpan.FromSeconds(10),
                            SegmentsPerWindow = 5,
                            QueueLimit = 0,                      // reject immediately, don't queue
                        });
                });

                // Tight limit for login / signup / refresh / email-token endpoints.
                //
                // Sliding, not fixed: a fixed minute allowed 10 at 0:59 and 10 more at 1:00 — double
                // the stated limit at every boundary. Twenty a minute, not ten: a class signing in
                // together shares one IP, and ten turned the eleventh student away. Per-account
                // brute force is not this limiter's job (it can't see the email in the body) — see
                // known-issues.md, "No per-account login throttle".
                options.AddPolicy(AuthPolicy, httpContext =>
                    RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: $"ip:{ClientIp(httpContext)}",
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 20,
                            Window = TimeSpan.FromMinutes(1),
                            SegmentsPerWindow = 6,
                            QueueLimit = 0,
                        }));

                // Guest-session creation. The one-free-quiz cookie already limits honest users;
                // this stops a script from spamming new guest sessions to churn the DB.
                options.AddPolicy(GuestPolicy, httpContext =>
                    RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: $"ip:{ClientIp(httpContext)}",
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 20,
                            Window = TimeSpan.FromMinutes(1),
                            SegmentsPerWindow = 6,
                            QueueLimit = 0,
                        }));

                // AI generation. Partitioned by USER, not IP — see UserOrIp below for why.
                // Deliberately small: a legitimate user generates a quiz, reviews it for
                // minutes, and generates again. Nobody honest needs six in a minute. The real
                // ceiling is the per-user daily quota; this only stops a burst.
                options.AddPolicy(AiPolicy, httpContext =>
                    RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: UserOrIp(httpContext),
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 6,
                            Window = TimeSpan.FromMinutes(1),
                            SegmentsPerWindow = 6,
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
        /// Partitions by authenticated user id, falling back to IP for anonymous callers.
        ///
        /// <para>Partitioning an authenticated endpoint by IP punishes shared connections: a
        /// school, library or office sits behind one public address (NAT), so thirty students
        /// on thirty laptops look like a single client and share one bucket. For AI generation
        /// — plausibly most used in exactly those places — that means the seventh person to
        /// press the button in a minute is told to slow down for something they didn't do.</para>
        ///
        /// <para>Safe here specifically because the endpoint is <c>[Authorize]</c>: a caller
        /// can't mint fresh partitions by lying, since the id comes from a signed token. Don't
        /// copy this to an anonymous endpoint, where the IP is the only thing that can't be
        /// forged — which is why <c>auth</c> and <c>guest</c> stay on <see cref="ClientIp"/>. The global
        /// limiter uses this too: a request with a valid token is counted for its user, one without
        /// for its IP, and a forged token is no token (authentication rejects it first).</para>
        ///
        /// <para>Keys are prefixed so a user id can never collide with an IP string.</para>
        ///
        /// <para>This runs after <c>UseAuthentication</c> (see the ordering in Program.cs), so
        /// the principal is populated by the time the limiter reads it.</para>
        /// </summary>
        internal static string UserOrIp(HttpContext context)
        {
            var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

            return string.IsNullOrWhiteSpace(userId)
                ? $"ip:{ClientIp(context)}"
                : $"user:{userId}";
        }

        /// <summary>
        /// The global limiter's partition: <c>null</c> for a hub's connection traffic (exempt),
        /// otherwise <see cref="UserOrIp"/>.
        ///
        /// <para>Hubs are recognised by the <see cref="HubMetadata"/> that <c>MapHub</c> puts on every
        /// endpoint it maps — not by path. The path list this replaced named <c>/quizHub</c> and
        /// <c>/notificationHub</c>; <c>/hostedGameHub</c>, added later for Host mode, was throttled
        /// with everything else from the day it shipped.</para>
        ///
        /// <para><b><c>negotiate</c> is still counted.</b> It is one request per new connection, so it
        /// costs a real client nothing — and it is the only cap on how fast a caller can open
        /// connections. That matters on <c>/hostedGameHub</c>, where a Display gets
        /// <c>HostedGameHub.MaxCodeAttempts</c> Screen-code guesses <i>per connection</i> (ADR 0024).
        /// Only the connection's own traffic (the WebSocket, or a fallback transport's polls) is
        /// exempt.</para>
        /// </summary>
        internal static string? GlobalPartitionKey(HttpContext context)
        {
            var isHub = context.GetEndpoint()?.Metadata.GetMetadata<HubMetadata>() is not null;
            var isNegotiate = context.Request.Path.Value?.EndsWith("/negotiate", StringComparison.OrdinalIgnoreCase) == true;
            return isHub && !isNegotiate ? null : UserOrIp(context);
        }

        /// <summary>
        /// The client's IP: the connection's remote address, and deliberately nothing else.
        ///
        /// <para>Behind Nginx + Cloudflare this is the visitor's address only because Nginx makes it
        /// so: it takes <c>CF-Connecting-IP</c> from Cloudflare's ranges alone (<c>real_ip</c>, see
        /// <c>deploy/nginx/cloudflare-real-ip.conf</c>), overwrites <c>X-Forwarded-For</c> with the
        /// result, and <c>UseForwardedHeaders</c> applies it here. A request sent straight to the
        /// origin keeps its own socket address, whatever headers it carries.</para>
        ///
        /// <para>This used to read <c>CF-Connecting-IP</c> itself, which let any caller who could reach
        /// the origin directly choose a fresh bucket per request — unlimited login attempts. See
        /// docs/adr/0027-the-client-ip-is-resolved-at-nginx.md.</para>
        /// </summary>
        internal static string ClientIp(HttpContext context) =>
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
