using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Services.FeaturedQuizzes
{
    /// <summary>
    /// Makes sure every database has what the quiz home page needs, in every environment:
    /// the baseline lookups (categories, languages, difficulties), the OxygenQuiz system account,
    /// and the sixteen featured quizzes. See docs/quiz/featured-quizzes.md.
    ///
    /// <para><b>Create if missing, never overwrite.</b> Every row is found by name (lookups) or
    /// <see cref="Quiz.FeaturedKey"/> (quizzes) and only created when absent. An existing row is left
    /// exactly as it is — an admin's renamed palette, an edited question, a deleted featured quiz
    /// (soft-deleted rows count as present). ADR 0026 records why.</para>
    /// </summary>
    public sealed class FeaturedQuizSeeder
    {
        /// <summary>A category the app ships with, and the palette a fresh database gives it.</summary>
        public sealed record BaselineCategory(string Name, string[]? Palette);

        /// <summary>
        /// The palettes are picked from each category's home-page photo, with white text on the
        /// first colour and the first colour on the second both at least 4.5:1. On a database where
        /// the category already exists the seeder leaves its palette alone — change it in the admin
        /// category editor (docs/quiz/featured-quizzes.md, "Category colours").
        /// </summary>
        public static readonly IReadOnlyList<BaselineCategory> Categories = new[]
        {
            new BaselineCategory("Unspecified", null),
            new BaselineCategory("Geography", new[] { "#0B5CA8", "#CFE3F5" }),
            new BaselineCategory("General Knowledge", new[] { "#8E3B2F", "#F2D6CF" }),
            new BaselineCategory("Science", new[] { "#4652C8", "#DCDFFA" }),
            new BaselineCategory("History", new[] { "#8E5326", "#F5E1C8" }),
        };

        public static readonly IReadOnlyList<string> Languages = new[] { "Unspecified", "English" };

        public static readonly IReadOnlyList<(string Level, int Weight)> Difficulties = new[]
        {
            ("Unspecified", 0), ("Easy", 1), ("Medium", 2), ("Hard", 3), ("Expert", 4),
        };

        /// <summary>Every featured quiz is played in English (the content is written in it).</summary>
        public const string FeaturedLanguage = "English";

        private readonly ApplicationDbContext _db;
        private readonly ILogger<FeaturedQuizSeeder> _logger;
        private readonly Func<FeaturedQuizContent> _loadContent;

        public FeaturedQuizSeeder(ApplicationDbContext db, ILogger<FeaturedQuizSeeder> logger)
            : this(db, logger, FeaturedQuizContent.Load) { }

        /// <summary>Tests pass their own content; the app reads the embedded file.</summary>
        public FeaturedQuizSeeder(ApplicationDbContext db, ILogger<FeaturedQuizSeeder> logger, Func<FeaturedQuizContent> loadContent)
        {
            _db = db;
            _logger = logger;
            _loadContent = loadContent;
        }

        public async Task SeedAsync(CancellationToken ct = default)
        {
            var owner = await EnsureSystemAccountAsync(ct);
            await EnsureLookupsAsync(owner, ct);
            await EnsureFeaturedQuizzesAsync(owner, ct);
        }

        // ── The OxygenQuiz account ─────────────────────────────────────────────────

        private async Task<Guid> EnsureSystemAccountAsync(CancellationToken ct)
        {
            var existing = await _db.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == SystemAccount.Id, ct);

            if (existing is not null)
            {
                if (!existing.IsProtected)
                {
                    existing.IsProtected = true;
                    await _db.SaveChangesAsync(ct);
                }
                return existing.Id;
            }

            // Names share one namespace across both columns (ADR 0017). A real person who signed up
            // as "oxygenquiz" before this account existed keeps their name; this one steps aside.
            var taken = await NameTakenAsync(SystemAccount.ImmutableName, ct);
            var account = new User
            {
                Id = SystemAccount.Id,
                ImmutableName = taken ? SystemAccount.FallbackImmutableName : SystemAccount.ImmutableName,
                Username = taken ? SystemAccount.FallbackUsername : SystemAccount.Username,
                Email = SystemAccount.Email,
                EmailConfirmed = true,
                // Random and never stored anywhere: this account is never logged into.
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                DateRegistered = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow,
                IsDeleted = false,
                IsProtected = true,
                ProfileImageUrl = string.Empty,
            };

            _db.Users.Add(account);
            await _db.SaveChangesAsync(ct);
            if (taken)
                _logger.LogWarning("The name '{Name}' was taken; seeded the featured-quiz owner as '{Fallback}'.",
                    SystemAccount.ImmutableName, account.Username);
            else
                _logger.LogInformation("Seeded the OxygenQuiz system account.");
            return account.Id;
        }

        private Task<bool> NameTakenAsync(string name, CancellationToken ct) =>
            _db.Users.IgnoreQueryFilters().AnyAsync(u =>
                u.ImmutableName.ToLower() == name || u.Username.ToLower() == name, ct);

        // ── Lookups ────────────────────────────────────────────────────────────────

        private async Task EnsureLookupsAsync(Guid owner, CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            var categoryNames = await _db.QuestionCategories.Select(c => c.Name.ToLower()).ToListAsync(ct);
            foreach (var category in Categories.Where(c => !categoryNames.Contains(c.Name.ToLower())))
            {
                _db.QuestionCategories.Add(new QuestionCategory
                {
                    Name = category.Name,
                    UserId = owner,
                    CreatedAt = now,
                    ColorPaletteJson = category.Palette is null ? null : JsonSerializer.Serialize(category.Palette),
                });
            }

            var languageNames = await _db.QuestionLanguages.Select(l => l.Language.ToLower()).ToListAsync(ct);
            foreach (var language in Languages.Where(l => !languageNames.Contains(l.ToLower())))
                _db.QuestionLanguages.Add(new QuestionLanguage { Language = language, UserId = owner, CreatedAt = now });

            var levels = await _db.QuestionDifficulties.Select(d => d.Level.ToLower()).ToListAsync(ct);
            foreach (var (level, weight) in Difficulties.Where(d => !levels.Contains(d.Level.ToLower())))
                _db.QuestionDifficulties.Add(new QuestionDifficulty { Level = level, Weight = weight, UserId = owner, CreatedAt = now });

            if (_db.ChangeTracker.HasChanges())
            {
                await _db.SaveChangesAsync(ct);
                _logger.LogInformation("Seeded missing baseline lookups.");
            }
        }

        // ── Featured quizzes ───────────────────────────────────────────────────────

        private async Task EnsureFeaturedQuizzesAsync(Guid owner, CancellationToken ct)
        {
            // Soft-deleted rows count: a SuperAdmin who deletes a featured quiz means it.
            var present = await _db.Quizzes.IgnoreQueryFilters()
                .Where(q => q.FeaturedKey != null)
                .Select(q => q.FeaturedKey!)
                .ToListAsync(ct);

            var missing = _loadContent().Quizzes.Where(q => !present.Contains(q.Key)).ToList();
            if (missing.Count == 0)
                return;

            var languageId = await LanguageIdAsync(FeaturedLanguage, ct);

            foreach (var definition in missing)
            {
                var problems = definition.Validate().ToList();
                if (problems.Count > 0)
                {
                    _logger.LogError("Featured quiz {Key} is invalid and was not seeded: {Problems}",
                        definition.Key, string.Join(" ", problems));
                    continue;
                }

                var categoryId = await CategoryIdAsync(definition.Category, ct);
                var difficultyId = await DifficultyIdAsync(definition.Difficulty, ct);
                if (categoryId is null || difficultyId is null || languageId is null)
                {
                    _logger.LogError("Featured quiz {Key} was not seeded: its category, difficulty or language is missing.",
                        definition.Key);
                    continue;
                }

                var quiz = new Quiz
                {
                    FeaturedKey = definition.Key,
                    Title = definition.Title,
                    Description = definition.Description,
                    UserId = owner,
                    CategoryId = categoryId.Value,
                    DifficultyId = difficultyId.Value,
                    LanguageId = languageId.Value,
                    Status = QuizStatus.Public,
                    Format = QuizFormat.Classic,
                    ShowFeedbackImmediately = true,
                    ShuffleQuestions = false,
                    TimeLimitInSeconds = definition.Questions.Sum(q => q.Seconds),
                    CreatedAt = DateTime.UtcNow,
                    Version = 1,
                };

                for (var i = 0; i < definition.Questions.Count; i++)
                {
                    var q = definition.Questions[i];
                    var question = BuildQuestion(q, owner, categoryId.Value, difficultyId.Value, languageId.Value);
                    quiz.QuizQuestions.Add(new QuizQuestion
                    {
                        Question = question,
                        OrderInQuiz = i,
                        TimeLimitInSeconds = q.Seconds,
                        PointSystem = PointSystem.Standard,
                        CreatedInVersion = 1,
                    });
                }

                _db.Quizzes.Add(quiz);
                await _db.SaveChangesAsync(ct);
                _logger.LogInformation("Seeded featured quiz {Key}.", definition.Key);
            }
        }

        private static QuestionBase BuildQuestion(
            FeaturedQuestionDefinition q, Guid owner, int categoryId, int difficultyId, int languageId)
        {
            QuestionBase question = q.Type switch
            {
                FeaturedQuestionType.MultipleChoice => new MultipleChoiceQuestion
                {
                    AnswerOptions = q.Options!
                        .Select((text, i) => new AnswerOption { Text = text, IsCorrect = i == q.Correct })
                        .ToList(),
                },
                FeaturedQuestionType.TrueFalse => new TrueFalseQuestion { CorrectAnswer = q.Answer!.Value },
                FeaturedQuestionType.TypeTheAnswer => new TypeTheAnswerQuestion
                {
                    CorrectAnswer = q.TextAnswer!,
                    AcceptableAnswers = q.Accept?.ToList() ?? new List<string>(),
                    IsCaseSensitive = false,
                    AllowPartialMatch = false,
                },
                _ => throw new InvalidOperationException($"Unknown question type {q.Type}."),
            };

            question.Text = q.Text;
            question.Explanation = q.Explanation;
            question.UserId = owner;
            // Global: these are public reference questions, and a guest must be able to load them.
            question.Visibility = QuestionVisibility.Global;
            question.CategoryId = categoryId;
            question.DifficultyId = difficultyId;
            question.LanguageId = languageId;
            question.CreatedAt = DateTime.UtcNow;
            return question;
        }

        private Task<int?> CategoryIdAsync(string name, CancellationToken ct) =>
            _db.QuestionCategories.Where(c => c.Name.ToLower() == name.ToLower())
                .OrderBy(c => c.Id).Select(c => (int?)c.Id).FirstOrDefaultAsync(ct);

        private Task<int?> DifficultyIdAsync(string level, CancellationToken ct) =>
            _db.QuestionDifficulties.Where(d => d.Level.ToLower() == level.ToLower())
                .OrderBy(d => d.ID).Select(d => (int?)d.ID).FirstOrDefaultAsync(ct);

        private Task<int?> LanguageIdAsync(string language, CancellationToken ct) =>
            _db.QuestionLanguages.Where(l => l.Language.ToLower() == language.ToLower())
                .OrderBy(l => l.Id).Select(l => (int?)l.Id).FirstOrDefaultAsync(ct);
    }
}
