using System.Security.Claims;
using System.Text;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
// MongoDB is intentionally not wired into DI. It backed write-only lobby-chat
// archival, which has been disabled so multiplayer chat is fully ephemeral. The
// driver package and source files are kept for the future chat system.
// To re-enable, see docs/mongodb.md.
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
builder.Services.AddSingleton<IMongoClient>(_ =>
{
    var connectionString = configuration.GetConnectionString("MongoDBConnection");
    return new MongoClient(connectionString);
});

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
builder.Services.AddScoped<IFileRepository, FileRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
builder.Services.AddScoped<IQuizRepository, QuizRepository>();
builder.Services.AddScoped<IUserService, UserService>();

// Exception Handling services
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Permission service
builder.Services.AddScoped<IPermissionService, PermissionService>();

// Core Entity Services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<QuizAPI.Controllers.Users.Services.IAvatarService, QuizAPI.Controllers.Users.Services.AvatarService>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<ITokenService, TokenService>();
// Invite-code signup gate (see docs/invite-code-system-plan.md). Stateless CSPRNG helper → singleton.
builder.Services.AddSingleton<QuizAPI.Services.Invitations.IInviteCodeGenerator, QuizAPI.Services.Invitations.InviteCodeGenerator>();
// Email verification: dev logger sender today; swap for a real provider in prod (see docs/email-verification.md).
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
// Write-only MongoDB sink for lobby chat retention; injected into the session manager below.
builder.Services.AddSingleton<ILobbyChatArchiver, LobbyChatArchiver>();
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

builder.Services.AddHttpContextAccessor();

// --- JWT Authentication ---
var jwtKey = configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured.");
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

// --- Rate limiting (app-level, behind Cloudflare) — see docs/rate-limiting.md ---
builder.Services.AddOxygenRateLimiting();

// --- Controllers & Swagger ---
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// --- Forwarded headers (behind Nginx + Cloudflare) ---
// The app sits behind a reverse proxy (Nginx) and Cloudflare, so the original request scheme/IP
// arrive in X-Forwarded-Proto / X-Forwarded-For. Without this the app thinks requests are http://
// and builds http:// image/asset URLs that browsers block on the https:// site. See docs/production-runbook.md §0.
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
// (see docs/deployment.md §3–§4). Until then, make it impossible to *silently* ship Production
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
        var header = $"Production configuration check found {problems.Count} issue(s) to fix before public launch (see docs/deployment.md §3):";
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
// of user-supplied data in those downloads (see docs/known-issues.md).
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
}

app.Run();