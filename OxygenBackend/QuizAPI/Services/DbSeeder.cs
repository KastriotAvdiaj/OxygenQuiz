using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using System.Text.Json;

namespace QuizAPI.Services
{
    /// <summary>
    /// Runtime (startup) seeding for data that can't live in migrations:
    ///  - the admin/superadmin account, whose BCrypt hash is non-deterministic and whose
    ///    password must come from configuration/secrets (never source control);
    ///  - Development-only sample lookups and questions, so a fresh dev DB isn't empty.
    ///
    /// Static reference data (roles, permissions) is seeded via HasData in the model and is
    /// NOT handled here. Every step is idempotent (check-then-insert), so running it on every
    /// startup is safe.
    /// </summary>
    public class DbSeeder
    {
        private const int SuperAdminRoleId = 3;

        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly IHostEnvironment _env;
        private readonly ILogger<DbSeeder> _logger;

        public DbSeeder(
            ApplicationDbContext db,
            IConfiguration config,
            IHostEnvironment env,
            ILogger<DbSeeder> logger)
        {
            _db = db;
            _config = config;
            _env = env;
            _logger = logger;
        }

        public async Task SeedAsync(CancellationToken ct = default)
        {
            var admin = await EnsureAdminAsync(ct);
            await EnsureGuestAccountAsync(ct);

            if (_env.IsDevelopment())
            {
                await EnsureSampleDataAsync(admin.Id, ct);
            }
        }

        /// <summary>
        /// Creates the single shared guest-play placeholder account (see docs/auth/guest-play.md) if it
        /// doesn't already exist. It never logs in — the password hash is unusable on purpose.
        /// </summary>
        private async Task EnsureGuestAccountAsync(CancellationToken ct)
        {
            var exists = await _db.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Id == GuestAccount.Id, ct);

            if (exists) return;

            var guest = new User
            {
                Id = GuestAccount.Id,
                Username = GuestAccount.Username,
                ImmutableName = GuestAccount.ImmutableName,
                Email = GuestAccount.Email,
                EmailConfirmed = true,
                // Random, never communicated anywhere — this account is never used to log in.
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                DateRegistered = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow,
                IsDeleted = false,
                ProfileImageUrl = string.Empty,
            };

            _db.Users.Add(guest);
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Seeded shared guest-play account.");
        }

        /// <summary>Creates the single admin/superadmin account if it doesn't already exist.</summary>
        private async Task<User> EnsureAdminAsync(CancellationToken ct)
        {
            const string adminImmutableName = "admin";

            var existing = await _db.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.ImmutableName == adminImmutableName, ct);

            if (existing is not null)
                return existing;

            var password = _config["Seed:AdminPassword"]
                ?? throw new InvalidOperationException(
                    "Seed:AdminPassword is not configured. Set it via user-secrets (dev) or " +
                    "an environment variable / secret store (prod) before starting the app.");

            var admin = new User
            {
                Id = Guid.NewGuid(),
                Username = _config["Seed:AdminUsername"] ?? "admin",
                ImmutableName = adminImmutableName,
                Email = _config["Seed:AdminEmail"] ?? "admin@example.com",
                EmailConfirmed = true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                DateRegistered = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow,
                IsDeleted = false,
                ProfileImageUrl = string.Empty,
                UserRoles = new List<UserRole>
                {
                    new() { RoleId = SuperAdminRoleId, AssignedAt = DateTime.UtcNow }
                }
            };

            _db.Users.Add(admin);
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Seeded admin account '{Username}'.", admin.Username);
            return admin;
        }

        /// <summary>
        /// Development-only sample content: lookups (languages/difficulties/categories) and a few
        /// questions. Each block is guarded so re-running never duplicates rows.
        /// </summary>
        private async Task EnsureSampleDataAsync(Guid adminUserId, CancellationToken ct)
        {
            if (!await _db.QuestionLanguages.IgnoreQueryFilters().AnyAsync(ct))
            {
                _db.QuestionLanguages.AddRange(
                    new QuestionLanguage { Language = "Unspecified", UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "English", UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "Spanish", UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "German", UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "French", UserId = adminUserId, CreatedAt = DateTime.UtcNow });
                await _db.SaveChangesAsync(ct);
            }

            if (!await _db.QuestionDifficulties.IgnoreQueryFilters().AnyAsync(ct))
            {
                _db.QuestionDifficulties.AddRange(
                    new QuestionDifficulty { Level = "Unspecified", Weight = 0, UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Easy", Weight = 1, UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Medium", Weight = 2, UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Hard", Weight = 3, UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Expert", Weight = 4, UserId = adminUserId, CreatedAt = DateTime.UtcNow });
                await _db.SaveChangesAsync(ct);
            }

            if (!await _db.QuestionCategories.IgnoreQueryFilters().AnyAsync(ct))
            {
                _db.QuestionCategories.AddRange(
                    new QuestionCategory { Name = "Unspecified", UserId = adminUserId, CreatedAt = DateTime.UtcNow },
                    new QuestionCategory { Name = "Science", UserId = adminUserId, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#2196F3", "#BBDEFB" }), Gradient = true },
                    new QuestionCategory { Name = "History", UserId = adminUserId, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#A1887F", "#D7CCC8" }) },
                    new QuestionCategory { Name = "Technology", UserId = adminUserId, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#455A64", "#CFD8DC" }), Gradient = true },
                    new QuestionCategory { Name = "Geography", UserId = adminUserId, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#4CAF50", "#C8E6C9" }) });
                await _db.SaveChangesAsync(ct);
            }

            if (!await _db.Questions.IgnoreQueryFilters().AnyAsync(ct))
            {
                var englishLangId = await _db.QuestionLanguages.IgnoreQueryFilters().Where(l => l.Language == "English").Select(l => l.Id).FirstAsync(ct);
                var easyDiffId = await _db.QuestionDifficulties.IgnoreQueryFilters().Where(d => d.Level == "Easy").Select(d => d.ID).FirstAsync(ct);
                var mediumDiffId = await _db.QuestionDifficulties.IgnoreQueryFilters().Where(d => d.Level == "Medium").Select(d => d.ID).FirstAsync(ct);
                var historyCatId = await _db.QuestionCategories.IgnoreQueryFilters().Where(c => c.Name == "History").Select(c => c.Id).FirstAsync(ct);
                var techCatId = await _db.QuestionCategories.IgnoreQueryFilters().Where(c => c.Name == "Technology").Select(c => c.Id).FirstAsync(ct);
                var scienceCatId = await _db.QuestionCategories.IgnoreQueryFilters().Where(c => c.Name == "Science").Select(c => c.Id).FirstAsync(ct);

                _db.Questions.AddRange(
                    new MultipleChoiceQuestion
                    {
                        Text = "What was the primary programming language used to create the first version of the Android OS?",
                        UserId = adminUserId,
                        Visibility = QuestionVisibility.Global,
                        LanguageId = englishLangId,
                        DifficultyId = mediumDiffId,
                        CategoryId = techCatId,
                        AnswerOptions = new List<AnswerOption>
                        {
                            new() { Text = "Kotlin", IsCorrect = false },
                            new() { Text = "Java", IsCorrect = true },
                            new() { Text = "C++", IsCorrect = false },
                            new() { Text = "Swift", IsCorrect = false }
                        }
                    },
                    new TrueFalseQuestion
                    {
                        Text = "The Great Wall of China is visible from the Moon with the naked eye.",
                        UserId = adminUserId,
                        Visibility = QuestionVisibility.Global,
                        LanguageId = englishLangId,
                        DifficultyId = easyDiffId,
                        CategoryId = historyCatId,
                        CorrectAnswer = false
                    },
                    new TypeTheAnswerQuestion
                    {
                        Text = "What is the chemical symbol for water?",
                        UserId = adminUserId,
                        Visibility = QuestionVisibility.Global,
                        LanguageId = englishLangId,
                        DifficultyId = easyDiffId,
                        CategoryId = scienceCatId,
                        CorrectAnswer = "H2O",
                        IsCaseSensitive = false,
                        AcceptableAnswers = new List<string> { "h2o" }
                    });

                await _db.SaveChangesAsync(ct);
                _logger.LogInformation("Seeded sample questions for development.");
            }
        }
    }
}
