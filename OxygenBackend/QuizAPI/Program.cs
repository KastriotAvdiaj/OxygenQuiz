using AutoMapper;
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
using QuizAPI.Services;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Interfaces;
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
            .AllowCredentials();
    });
});

// --- DataSeeder Registration ---
builder.Services.AddScoped<DataSeeder>();

// --- Hangfire ---
builder.Services.AddHangfire(config =>
{
    config.UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(configuration.GetConnectionString("PostgresConnection")));
});
builder.Services.AddHangfireServer();

// --- AutoMapper ---
builder.Services.AddAutoMapper(typeof(Program));

// --- Service Registrations ---

// Core Entity Services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IQuizService, QuizService>();
builder.Services.AddScoped<IQuestionService, QuestionService>();
builder.Services.AddScoped<ITestQuestionService, TestQuestionService>();
builder.Services.AddScoped<IAnswerOptionService, AnswerOptionService>();

// Session & Answer Services
builder.Services.AddScoped<IQuizSessionService, QuizSessionService>();
builder.Services.AddScoped<IUserAnswerService, UserAnswerService>();

// Business Logic Services
builder.Services.AddScoped<IAnswerGradingService, AnswerGradingService>();
builder.Services.AddScoped<ISessionAbandonmentService, SessionAbandonmentService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// Image Services (ImageCleanUpService without interface as requested)
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddScoped<ImageCleanUpService>();

builder.Services.AddHttpContextAccessor();

// --- JWT Authentication ---
var jwtKey = configuration["Jwt:Key"];
var key = Encoding.ASCII.GetBytes(jwtKey ?? "SECRET_KEY");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !environment.IsDevelopment();
    options.SaveToken = true;
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
});

// --- Controllers & Swagger ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// --- Database Migration & Seeding ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        context.Database.Migrate();
        Console.WriteLine("✅ Database migrated successfully.");

        // Run DataSeeder
        var seeder = services.GetRequiredService<DataSeeder>();
        seeder.SeedData();
        Console.WriteLine("✅ Database seeded successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Database operation failed: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
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

app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.UseHangfireDashboard("/hangfire");
app.MapControllers();

RecurringJob.AddOrUpdate<ImageCleanUpService>(
    "image-cleanup-daily",
    service => service.RunCleanupAsync(),
    Cron.Daily(2) // 2 AM every day
);

app.Run();