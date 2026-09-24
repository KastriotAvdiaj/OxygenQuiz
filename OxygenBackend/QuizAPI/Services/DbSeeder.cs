using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
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
            var guestRow = await _db.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == GuestAccount.Id, ct);

            if (guestRow is not null)
            {
                // Same self-heal as the admin row above, and for the same reason.
                if (!guestRow.IsProtected)
                {
                    guestRow.IsProtected = true;
                    await _db.SaveChangesAsync(ct);
                    _logger.LogInformation("Marked shared guest-play account as protected.");
                }

                return;
            }

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
                IsProtected = true,
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
            {
                // Self-heal rather than return straight away. Every environment that predates
                // IsProtected already has this row, so the seeder is the only thing that ever runs
                // against it — and if it returned here, the column would sit at its `false` default
                // forever and the guard would protect nothing. The migration backfills too; this
                // covers the database restored from a pre-migration backup.
                // See docs/adr/0011-system-accounts-are-protected-rows.md.
                if (!existing.IsProtected)
                {
                    existing.IsProtected = true;
                    await _db.SaveChangesAsync(ct);
                    _logger.LogInformation("Marked seeded admin account as protected.");
                }

                return existing;
            }

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
                IsProtected = true,
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

            await EnsureSampleAssociationsBoardAsync(adminUserId, ct);
        }

        /// <summary>
        /// One Public Associations quiz, so the format can be tried in development without first
        /// authoring a Board (docs/quiz/associations.md). Seeded once: skipped whenever any
        /// Associations quiz already exists, so deleting it and restarting brings it back but
        /// editing it doesn't get overwritten.
        /// </summary>
        private async Task EnsureSampleAssociationsBoardAsync(Guid adminUserId, CancellationToken ct)
        {
            if (await _db.Quizzes.IgnoreQueryFilters().AnyAsync(q => q.Format == QuizFormat.Associations, ct))
                return;

            var englishId = await _db.QuestionLanguages.IgnoreQueryFilters().Where(l => l.Language == "English").Select(l => l.Id).FirstOrDefaultAsync(ct);
            var mediumId = await _db.QuestionDifficulties.IgnoreQueryFilters().Where(d => d.Level == "Medium").Select(d => d.ID).FirstOrDefaultAsync(ct);
            var geographyId = await _db.QuestionCategories.IgnoreQueryFilters().Where(c => c.Name == "Geography").Select(c => c.Id).FirstOrDefaultAsync(ct);
            if (englishId == 0 || mediumId == 0 || geographyId == 0)
                return;   // the lookups were renamed or removed; nothing sensible to seed against

            var quiz = new Quiz
            {
                Title = "Italian cities",
                Description = "A sample Associations board.",
                UserId = adminUserId,
                CategoryId = geographyId,
                LanguageId = englishId,
                DifficultyId = mediumId,
                Status = QuizStatus.Public,
                Format = QuizFormat.Associations,
                TimeLimitInSeconds = 240,
                CreatedAt = DateTime.UtcNow,
                Version = 1,
            };

            static QuizAPI.Models.Associations.AssociationColumn Column(int position, string solution, params string[] tiles) => new()
            {
                Position = position,
                Solution = solution,
                Tiles = tiles.Select((text, i) => new QuizAPI.Models.Associations.AssociationTile { Position = i, Text = text }).ToList(),
            };

            _db.Quizzes.Add(quiz);
            _db.AssociationBoards.Add(new QuizAPI.Models.Associations.AssociationBoard
            {
                Quiz = quiz,
                CreatedInVersion = 1,
                FinalSolution = "Italy",
                FinalAcceptableSolutions = new List<string> { "Italia" },
                Columns = new List<QuizAPI.Models.Associations.AssociationColumn>
                {
                    Column(0, "Rome", "Tiber", "Colosseum", "Vatican", "Seven hills"),
                    Column(1, "Venice", "Gondola", "Canals", "Carnival", "Lagoon"),
                    Column(2, "Milan", "Duomo", "Fashion week", "La Scala", "San Siro"),
                    Column(3, "Naples", "Vesuvius", "Pizza", "Bay", "Maradona"),
                },
            });

            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Seeded a sample Associations board for development.");
        }
    }
}
