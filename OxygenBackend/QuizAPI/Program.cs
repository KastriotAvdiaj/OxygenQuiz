using System.Security.Claims;
using System.Text;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
// MongoDB is intentionally not wired into DI. It backed write-only lobby-chat
// archival, which has been disabled so multiplayer chat is fully ephemeral. The
// driver package and source files are kept for the future chat system.
// To re-enable, see docs/data/mongodb.md.
// using MongoDB.Driver;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.Controllers.Questions.Services.AnswerOptions;
using QuizAPI.Controllers.Questions.TestQuestions.Services;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService;
using QuizAPI.Data;
using QuizAPI.Middleware;
using QuizAPI.Repositories;
using QuizAPI.Services.Ai.CategoryPalette;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Interfaces;
using QuizAPI.Services.Permissions;
using QuizAPI.Services.QuizSessionServices;


var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
var environment = builder.Environment;

// --- Database Context ---
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(configuration.GetConnectionString("PostgresConnection")));

// --- MongoDB ---
// Intentionally not registered. MongoDB backed write-only lobby-chat archival, which is
// disabled in this deployment (see NoOpLobbyChatArchiver below). Re-enable this block and the
// `using MongoDB.Driver;` import above, and swap the archiver registration back to
// LobbyChatArchiver, if chat retention is ever needed. See docs/data/mongodb.md.
// builder.Services.AddSingleton<IMongoClient>(_ =>
// {
//     var connectionString = configuration.GetConnectionString("MongoDBConnection");
//     return new MongoClient(connectionString);
// });

var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();

// --- CORS Configuration ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", builder =>
    {
        builder.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("Pagination");
    });
});

// --- Seeder Registration ---
builder.Services.AddScoped<QuizAPI.Services.DbSeeder>();

// --- Hangfire ---
builder.Services.AddHangfire(config =>
{
    config.UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(configuration.GetConnectionString("PostgresConnection")));
});
builder.Services.AddHangfireServer();

//IMemoryCache
builder.Services.AddMemoryCache();

// --- Data Protection ---
// Persist the Data Protection key ring to a mounted volume (/app/keys) instead of the container's
// ephemeral filesystem. Without this, keys are regenerated every time the container is rebuilt,
// which invalidates anything they encrypt (antiforgery tokens, protected cookies). The /app/keys
// directory is created (owned by the app user) in the Dockerfile and mapped to a Docker volume.
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo("/app/keys"))
    .SetApplicationName("OxygenQuiz");

// --- Service Registrations ---

// User related services and repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IEmailVerificationTokenRepository, EmailVerificationTokenRepository>();
builder.Services.AddScoped<IInviteCodeRepository, InviteCodeRepository>();
builder.Services.AddScoped<IExternalLoginRepository, ExternalLoginRepository>();
builder.Services.AddScoped<IFileRepository, FileRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
builder.Services.AddScoped<IQuizRepository, QuizRepository>();
builder.Services.AddScoped<IQuestionCategoryRepository, QuestionCategoryRepository>();
builder.Services.AddScoped<IQuestionDifficultyRepository, QuestionDifficultyRepository>();
builder.Services.AddScoped<IQuestionLanguageRepository, QuestionLanguageRepository>();
builder.Services.AddScoped<ICategoryPaletteService, CategoryPaletteService>();
builder.Services.AddScoped<IUserService, UserService>();

// Exception Handling services
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Permission service
builder.Services.AddScoped<IPermissionService, PermissionService>();

// Core Entity Services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<QuizAPI.Controllers.Users.Services.IAvatarService, QuizAPI.Controllers.Users.Services.AvatarService>();
// Profile play-stats (read-only aggregation — see docs/quiz/user-stats-history.md).
builder.Services.AddScoped<QuizAPI.Controllers.Users.Services.UserStatsService.IUserStatsService, QuizAPI.Controllers.Users.Services.UserStatsService.UserStatsService>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<ITokenService, TokenService>();
// Invite-code signup gate (see docs/auth/invite-code-system-plan.md). Stateless CSPRNG helper → singleton.
builder.Services.AddSingleton<QuizAPI.Services.Invitations.IInviteCodeGenerator, QuizAPI.Services.Invitations.InviteCodeGenerator>();
// External sign-in verifiers (Google/Microsoft — see docs/auth/social-login-plan.md).
// Singletons so each provider's OIDC metadata/JWKS cache is shared across requests.
builder.Services.AddSingleton<QuizAPI.Services.AuthenticationService.External.IExternalIdentityVerifier,
    QuizAPI.Services.AuthenticationService.External.GoogleIdentityVerifier>();
builder.Services.AddSingleton<QuizAPI.Services.AuthenticationService.External.IExternalIdentityVerifier,
    QuizAPI.Services.AuthenticationService.External.MicrosoftIdentityVerifier>();

// Fail fast on a half-configured provider: enabled without a client id can only produce
// confusing runtime 401s, so refuse to start instead — same convention as the Jwt:Key check.
foreach (var provider in new[] { "Google", "Microsoft" })
{
    if (configuration.GetValue<bool>($"Authentication:{provider}:Enabled") &&
        string.IsNullOrWhiteSpace(configuration[$"Authentication:{provider}:ClientId"]))
        throw new InvalidOperationException(
            $"Authentication:{provider}:Enabled is true but Authentication:{provider}:ClientId is not configured.");
}
// Email verification: dev logger sender today; swap for a real provider in prod (see docs/auth/email-verification.md).
builder.Services.AddScoped<QuizAPI.Services.Email.IEmailSender, QuizAPI.Services.Email.LoggingEmailSender>();
builder.Services.AddScoped<IQuizService, QuizService>();
builder.Services.AddScoped<IQuestionService, QuestionService>();
builder.Services.AddScoped<ITestQuestionService, TestQuestionService>();
builder.Services.AddScoped<IAnswerOptionService, AnswerOptionService>();

// Session & Answer Services
builder.Services.AddScoped<IQuizSessionService, QuizSessionService>();
builder.Services.AddScoped<
    QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService.ISubmitAnswerService,
    QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.SubmitAnswerService.SubmitAnswerService>();
builder.Services.AddScoped<IUserAnswerService, UserAnswerService>();
// Lobby chat is ephemeral in this deployment: use the no-op archiver so the session manager has
// its dependency without requiring MongoDB. Swap back to LobbyChatArchiver (and re-enable the
// IMongoClient registration above) to persist chat retention.
builder.Services.AddSingleton<ILobbyChatArchiver, NoOpLobbyChatArchiver>();
builder.Services.AddSingleton<IQuizSessionManager, InMemoryQuizSessionManager>();
// Drives the live multiplayer match loop (singleton: it owns running matches). See docs/plans/multiplayer-phase1.md.
builder.Services.AddSingleton<IMatchOrchestrator, MatchOrchestrator>();

// Business Logic Services
builder.Services.AddScoped<IAnswerGradingService, AnswerGradingService>();
builder.Services.AddScoped<ISessionAbandonmentService, SessionAbandonmentService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<QuizAPI.Services.SettingsService.ISettingsService, QuizAPI.Services.SettingsService.SettingsService>();

// Image Services (ImageCleanUpService without interface as requested)
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddScoped<ImageCleanUpService>();

// Generic file upload service
builder.Services.AddScoped<QuizAPI.Controllers.Files.Services.IFileService, QuizAPI.Controllers.Files.Services.FileService>();

// Audit trail + in-app notifications
builder.Services.AddScoped<QuizAPI.Services.Audit.IAuditService, QuizAPI.Services.Audit.AuditService>();
builder.Services.AddScoped<QuizAPI.Controllers.Notifications.Services.INotificationService, QuizAPI.Controllers.Notifications.Services.NotificationService>();

// Data export / import (CSV / Excel / JSON) — stateless, so singletons are fine.
builder.Services.AddSingleton<QuizAPI.Services.DataTransfer.IDataExportService, QuizAPI.Services.DataTransfer.DataExportService>();
builder.Services.AddSingleton<QuizAPI.Services.DataTransfer.IDataImportService, QuizAPI.Services.DataTransfer.DataImportService>();

// Dynamic reports (quiz performance, question analytics) — scoped, reads the DbContext.
builder.Services.AddScoped<QuizAPI.Services.Reports.IReportService, QuizAPI.Services.Reports.ReportService>();

// --- In-app AI quiz generation (docs/quiz/ai-quiz-generation-plan.md) ---
builder.Services.Configure<QuizAPI.Services.Ai.AiOptions>(
    configuration.GetSection(QuizAPI.Services.Ai.AiOptions.SectionName));

// Two providers exist, and the choice is about *how we get a completion*, not about which
// vendor: "Fake" is the offline stub, "OpenAiCompatible" is a real HTTP call to whatever
// Ai:BaseUrl points at. The vendor lives in Ai:BaseUrl + Ai:Model, never here — the class was
// called DeepSeekQuizAiProvider until 2026-08-22 and the name kept implying otherwise.
// Unset means the AiOptions default, not a configuration error — an appsettings.json without
// an Ai section must still boot.
var aiProviderName = configuration[$"{QuizAPI.Services.Ai.AiOptions.SectionName}:Provider"];
if (string.IsNullOrWhiteSpace(aiProviderName)) aiProviderName = "OpenAiCompatible";

var useFakeAiProvider = string.Equals(aiProviderName, "Fake", StringComparison.OrdinalIgnoreCase);

// Legacy vendor names still boot — an existing .env or user-secrets holding "DeepSeek" must not
// take the API down over a rename — but they are called out, because a vendor name here reads as
// if it selected the vendor, and it never did.
var isLegacyVendorProviderName =
    string.Equals(aiProviderName, "DeepSeek", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(aiProviderName, "Qwen", StringComparison.OrdinalIgnoreCase);

// Anything else is a typo, and the old code silently treated a typo as "make real paid calls".
// Fail instead: a misspelled provider is exactly when you least want the billable default.
if (!useFakeAiProvider &&
    !isLegacyVendorProviderName &&
    !string.Equals(aiProviderName, "OpenAiCompatible", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException(
        $"Ai:Provider is \"{aiProviderName}\", which is not a provider. Use \"OpenAiCompatible\" for a real vendor (set the vendor with Ai:BaseUrl and Ai:Model) or \"Fake\" for development.");

// The fake provider invents questions out of nothing. Serving those to real users would be
// worse than the feature being switched off, so a misconfigured deploy is refused rather than
// warned about.
if (useFakeAiProvider && environment.IsProduction())
    throw new InvalidOperationException(
        "Ai:Provider is \"Fake\", which is a development-only stub and must never run in Production.");

// Fail fast on a half-configured real provider: enabled with no key can only produce runtime
// 502s, which look like an outage rather than a config mistake. Same convention as the Jwt:Key
// and external-auth checks above. The fake provider needs no key, hence the exemption.
//
// Development is exempt, and that is not a softening of the rule — it is the rule applied to a
// different situation. `appsettings.Development.json` is COMMITTED, so its Ai:Enabled=true plus
// OpenAiCompatible is the default inherited by every fresh clone and by the backend container in
// docker-compose.yml, neither of which has user-secrets to supply a key. Throwing there does not
// catch a misconfigured deploy, it stops the app booting for people who never opted into AI at
// all. So in Development fall back to the stub and say so; in Production still refuse, because
// there the reasoning above holds exactly.
//
// The consequence to know: adding Ai__ApiKey to user-secrets is the ONLY step needed to test
// against the real vendor. Nothing else toggles — the vendor block in appsettings.Development.json
// is already the real one. Remove the key and you are back on the stub.
if (configuration.GetValue<bool>($"{QuizAPI.Services.Ai.AiOptions.SectionName}:Enabled") &&
    !useFakeAiProvider &&
    string.IsNullOrWhiteSpace(configuration[$"{QuizAPI.Services.Ai.AiOptions.SectionName}:ApiKey"]))
{
    if (environment.IsDevelopment())
    {
        useFakeAiProvider = true;
        Console.WriteLine(
            "[AI] Ai:Enabled is true but no Ai:ApiKey is configured — falling back to the Fake " +
            "provider. To call the real vendor: dotnet user-secrets set \"Ai:ApiKey\" \"<key>\"");
    }
    else
        throw new InvalidOperationException(
            "Ai:Enabled is true but Ai:ApiKey is not configured. Supply it via the Ai__ApiKey environment variable or user-secrets, or set Ai:Provider to \"Fake\" for development.");
}

// Stateless prompt construction → singleton.
builder.Services.AddSingleton<QuizAPI.Services.Ai.AiPromptBuilder>();

if (useFakeAiProvider)
{
    // Everything downstream of the provider still runs for real — quota, budget, audit, error
    // mapping — so this exercises the feature rather than mocking it. See the trigger words in
    // FakeQuizAiProvider for reaching each failure path on demand.
    builder.Services.AddScoped<QuizAPI.Services.Ai.IQuizAiProvider, QuizAPI.Services.Ai.FakeQuizAiProvider>();
}
else
{
    // Typed client so the handler (and its connection pool) is reused; the per-call deadline is
    // enforced inside the provider with a linked token, so the client's own timeout is left generous.
    builder.Services.AddHttpClient<QuizAPI.Services.Ai.IQuizAiProvider, QuizAPI.Services.Ai.OpenAiCompatibleQuizAiProvider>((sp, client) =>
    {
        var aiOptions = sp.GetRequiredService<IOptions<QuizAPI.Services.Ai.AiOptions>>().Value;
        // Trailing slash matters: without it the relative "chat/completions" would replace the
        // last path segment of BaseAddress rather than append to it.
        client.BaseAddress = new Uri(aiOptions.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = Timeout.InfiniteTimeSpan;
    });
}
builder.Services.AddScoped<IAiGenerationUsageRepository, AiGenerationUsageRepository>();
builder.Services.AddScoped<QuizAPI.Services.Ai.IAiQuotaPolicy, QuizAPI.Services.Ai.ConfigAiQuotaPolicy>();
builder.Services.AddScoped<QuizAPI.Services.Ai.IAiQuotaService, QuizAPI.Services.Ai.AiQuotaService>();
builder.Services.AddScoped<QuizAPI.Services.Ai.IAiGenerationService, QuizAPI.Services.Ai.AiGenerationService>();
builder.Services.AddScoped<QuizAPI.Services.Ai.AiReservationSweeper>();

builder.Services.AddHttpContextAccessor();

// --- JWT Authentication ---
// `??` caught null and nothing else, so `Jwt__Key=` (empty) or `Jwt__Key=" "` sailed straight
// past this guard — an env var set to an empty string is a PRESENT value. Empty happens to fail
// later inside SymmetricSecurityKey as an opaque IDX10703; whitespace does not fail at all, and
// booted the API signing every token with a one-byte secret. The length floor is the half that
// actually buys something: HMAC-SHA256 keys shorter than the 256-bit hash are weaker for no
// gain, and a short key is the realistic mistake, not a missing one.
var jwtKey = configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException(
        "Jwt:Key is not configured, or is shorter than the 32 bytes HMAC-SHA256 requires. " +
        "Generate one with: openssl rand -base64 48");
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !environment.IsDevelopment();
    options.SaveToken = true;
    options.MapInboundClaims = false;   // keep 'sub'/'email' literal — see /me
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = configuration["Jwt:Issuer"],
        ValidAudience = configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };

    // WebSockets can't send an Authorization header, so SignalR passes the JWT in the
    // access_token query string. Read it for the SignalR hub handshakes (notifications + quiz).
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/notificationHub") || path.StartsWithSegments("/quizHub")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// --- Rate limiting (app-level, behind Cloudflare) — see docs/development/rate-limiting.md ---
builder.Services.AddOxygenRateLimiting();

// --- Controllers & Swagger ---
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Deprecation notice for a vendor name in Ai:Provider. A warning rather than a throw: an
// existing .env or user-secrets holding "DeepSeek" predates the rename, and taking the API down
// over it would be a worse outcome than the confusion it causes. Deleting the legacy branch is
// safe once no environment sets one — check .env on the VPS before you do.
if (isLegacyVendorProviderName)
    app.Logger.LogWarning(
        "Ai:Provider is \"{Provider}\", which names a vendor. The provider is chosen by transport, " +
        "not by vendor: set Ai:Provider to \"OpenAiCompatible\" and choose the vendor with " +
        "Ai:BaseUrl + Ai:Model (currently {BaseUrl} / {Model}). The legacy value still works.",
        aiProviderName,
        configuration[$"{QuizAPI.Services.Ai.AiOptions.SectionName}:BaseUrl"],
        configuration[$"{QuizAPI.Services.Ai.AiOptions.SectionName}:Model"]);

// --- Forwarded headers (behind Nginx + Cloudflare) ---
// The app sits behind a reverse proxy (Nginx) and Cloudflare, so the original request scheme/IP
// arrive in X-Forwarded-Proto / X-Forwarded-For. Without this the app thinks requests are http://
// and builds http:// image/asset URLs that browsers block on the https:// site. See docs/deployment/production-runbook.md §0.
var forwardedOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                     | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
};
// Nginx is the only ingress and runs on a trusted host, so trust the whole chain.
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);

// --- Database Migration & Seeding ---
// Apply pending migrations (this also applies HasData reference seeding: roles, permissions),
// then run the runtime seeder (admin account + dev-only sample data).
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        await context.Database.MigrateAsync();

        var seeder = services.GetRequiredService<QuizAPI.Services.DbSeeder>();
        await seeder.SeedAsync();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Database migration/seeding failed.");
        throw; // fail fast: a broken schema/seed shouldn't serve traffic
    }
}

// --- Production configuration safety-guard ---
// AllowedHosts / CORS / JWT issuer+audience can only be finalised once a real domain exists
// (see docs/deployment/deployment.md §3–§4). Until then, make it impossible to *silently* ship Production
// with launch-blocking defaults: collect any problems and log a loud warning for each. By default
// this only warns (so an in-progress staging box still boots); set Security:EnforceProductionConfig
// to make the same checks fatal once your domain is live, turning this into a hard launch gate.
if (environment.IsProduction())
{
    var problems = new List<string>();

    var allowedHosts = configuration["AllowedHosts"];
    if (string.IsNullOrWhiteSpace(allowedHosts) || allowedHosts.Trim() == "*")
        problems.Add("AllowedHosts is '*' (or unset) — set it to your real API host(s) to blunt host-header attacks.");

    var prodCorsOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    if (prodCorsOrigins.Length == 0)
        problems.Add("Cors:AllowedOrigins is empty — the frontend won't be allowed to call the API.");
    foreach (var origin in prodCorsOrigins)
    {
        if (origin.Contains("localhost", StringComparison.OrdinalIgnoreCase))
            problems.Add($"Cors:AllowedOrigins contains a localhost origin ('{origin}') — remove it from Production.");
        else if (origin.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            problems.Add($"Cors:AllowedOrigins contains a non-HTTPS origin ('{origin}') — use https in Production.");
    }

    foreach (var settingKey in new[] { "Jwt:Issuer", "Jwt:Audience" })
    {
        var value = configuration[settingKey];
        if (!string.IsNullOrWhiteSpace(value) && value.Contains("localhost", StringComparison.OrdinalIgnoreCase))
            problems.Add($"{settingKey} still points at localhost ('{value}') — set it to your real domain.");
    }

    if (problems.Count > 0)
    {
        var header = $"Production configuration check found {problems.Count} issue(s) to fix before public launch (see docs/deployment/deployment.md §3):";
        var body = string.Join(Environment.NewLine, problems.Select(p => "  • " + p));

        if (configuration.GetValue<bool>("Security:EnforceProductionConfig"))
            throw new InvalidOperationException(
                header + Environment.NewLine + body + Environment.NewLine +
                "Set Security:EnforceProductionConfig=false to downgrade this to a warning.");

        app.Logger.LogWarning(
            "{Header}{NewLine}{Body}{NewLine}(Set Security:EnforceProductionConfig=true to make these fatal once your domain is live.)",
            header, Environment.NewLine, body, Environment.NewLine);
    }
}

// --- Middleware Configuration ---

// Security headers (first, so every response — controllers, static files, exports — gets them).
// X-Content-Type-Options: nosniff stops browsers MIME-sniffing a response into something
// executable. File exports already force Content-Disposition: attachment via the File(...,
// fileDownloadName) overload; nosniff is the defense-in-depth complement against content-sniffing
// of user-supplied data in those downloads (see docs/deployment/known-issues.md).
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Serve uploaded files (avatars, quiz/question images) from wwwroot as static files.
// Without this, URLs like /uploads/files/<guid>.png 404 even though the file exists on disk.
app.UseStaticFiles();

app.UseExceptionHandler();

app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();

// After auth so rejection logging/limits can use identity later if needed; before endpoints so
// limits apply to controller actions. SignalR hubs are exempted inside the limiter config.
app.UseRateLimiter();

// Dashboard has no login of its own — JWT bearer auth (this API's only auth scheme) can't
// protect a page you open directly in a browser, since there's no header to attach. Until
// there's a cookie-based admin login, the safest fix is to not expose it outside development.
if (!environment.IsProduction())
{
    app.UseHangfireDashboard("/hangfire");
}

app.MapControllers();
app.MapHub<QuizAPI.Hubs.QuizHub>("/quizHub");
app.MapHub<QuizAPI.Hubs.NotificationHub>("/notificationHub");

// Schedule recurring jobs through the DI-registered IRecurringJobManager rather than the static
// RecurringJob API. The static API depends on Hangfire's global JobStorage.Current, which only gets
// initialized as a side effect of mapping the Hangfire dashboard — and the dashboard is intentionally
// NOT mapped in Production (see above). Resolving the manager from DI is wired to the configured
// Postgres storage directly, so recurring jobs register correctly in every environment.
using (var scope = app.Services.CreateScope())
{
    var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobs.AddOrUpdate<ImageCleanUpService>(
        "image-cleanup-daily",
        service => service.RunCleanupAsync(),
        Cron.Daily(2) // 2 AM every day
    );

    // Frees quota slots held by generations that never finished (crash, dropped connection).
    // Runs often because the cost of a stuck reservation is a user who can't generate.
    recurringJobs.AddOrUpdate<QuizAPI.Services.Ai.AiReservationSweeper>(
        "ai-reservation-sweep",
        service => service.RunAsync(),
        "*/5 * * * *" // every 5 minutes
    );
}

app.Run();