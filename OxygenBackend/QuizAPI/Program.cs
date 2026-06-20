using System.Security.Claims;
using System.Text;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
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
using System.Text;


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

// --- Service Registrations ---

// User related services and repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
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

// --- Controllers & Swagger ---
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

// --- Middleware Configuration ---
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
app.UseHangfireDashboard("/hangfire");
app.MapControllers();
app.MapHub<QuizAPI.Hubs.QuizHub>("/quizHub");
app.MapHub<QuizAPI.Hubs.NotificationHub>("/notificationHub");

RecurringJob.AddOrUpdate<ImageCleanUpService>(
    "image-cleanup-daily",
    service => service.RunCleanupAsync(),
    Cron.Daily(2) // 2 AM every day
);

app.Run();