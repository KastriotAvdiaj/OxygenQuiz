using Bogus;
using QuizAPI.Models;
using System.Text.Json; // Make sure this using is present

namespace QuizAPI.Data
{
    public class DataSeeder
    {
        private readonly ApplicationDbContext _context;

        public DataSeeder(ApplicationDbContext context)
        {
            _context = context;
        }

        public void SeedData()
        {
            // 1. Seed Roles
            if (!_context.Roles.Any())
            {
                var roles = new List<Role>
                {
                    new Role { Name = "User", isActive = true, Description = "Regular user", ConcurrencyStamp = Guid.NewGuid() },
                    new Role { Name = "Admin", isActive = true, Description = "Administrator", ConcurrencyStamp = Guid.NewGuid() },
                    new Role { Name = "SuperAdmin", isActive = true, Description = "Super Administrator", ConcurrencyStamp = Guid.NewGuid() }
                };

                _context.Roles.AddRange(roles);
                _context.SaveChanges();
            }

            // Get Roles for user assignment
            var roleUser = _context.Roles.First(r => r.Name == "User");
            var roleAdmin = _context.Roles.First(r => r.Name == "Admin");
            var roleSuperAdmin = _context.Roles.First(r => r.Name == "SuperAdmin");

            // 2. Seed Users
            if (!_context.Users.Any())
            {
                var users = new List<User>();
                var faker = new Faker("en");

                // Add specific SuperAdmin
                users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    Username = "admin",
                    ImmutableName = "admin",
                    Email = "kaloti.avdiaj@gmail.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                    DateRegistered = DateTime.UtcNow,
                    RoleId = roleSuperAdmin.Id,
                    ConcurrencyStamp = Guid.NewGuid(),
                    IsDeleted = false,
                    LastLogin = DateTime.UtcNow,
                    ProfileImageUrl = faker.Internet.Avatar()
                });

                // Add 1 fake Admin
                users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    Username = faker.Internet.UserName(),
                    ImmutableName = faker.Internet.UserName(),
                    Email = faker.Internet.Email(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("1"),
                    DateRegistered = DateTime.UtcNow,
                    RoleId = roleAdmin.Id,
                    ConcurrencyStamp = Guid.NewGuid(),
                    IsDeleted = false,
                    LastLogin = DateTime.UtcNow,
                    ProfileImageUrl = faker.Internet.Avatar()
                });

                // Add hundreds of Users
                for (int i = 0; i < 200; i++)
                {
                    var username = faker.Internet.UserName();
                    users.Add(new User
                    {
                        Id = Guid.NewGuid(),
                        Username = username,
                        ImmutableName = username.ToLowerInvariant(),
                        Email = faker.Internet.Email(),
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("1"),
                        DateRegistered = faker.Date.Past(1),
                        RoleId = roleUser.Id,
                        ConcurrencyStamp = Guid.NewGuid(),
                        IsDeleted = false,
                        LastLogin = faker.Date.Recent(),
                        ProfileImageUrl = faker.Internet.Avatar()
                    });
                }

                _context.Users.AddRange(users);
                _context.SaveChanges();
            }

            // Get the Admin user for creating default questions/categories etc.
            var adminUser = _context.Users.First(u => u.RoleId == roleSuperAdmin.Id);

            // 3. Seed Question Languages
            if (!_context.QuestionLanguages.Any())
            {
                var languages = new List<QuestionLanguage>
                {
                    // "Unspecified" is first to ensure it gets Id = 1
                    new QuestionLanguage { Language = "Unspecified", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "English", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "Spanish", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "German", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionLanguage { Language = "French", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow }
                };
                _context.QuestionLanguages.AddRange(languages);
                _context.SaveChanges();
            }

            // 4. Seed Question Difficulties
            if (!_context.QuestionDifficulties.Any())
            {
                var difficulties = new List<QuestionDifficulty>
                {
                    // "Unspecified" is first to ensure it gets Id = 1
                    new QuestionDifficulty { Level = "Unspecified", Weight = 0, UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Easy", Weight = 1, UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Medium", Weight = 2, UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Hard", Weight = 3, UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionDifficulty { Level = "Expert", Weight = 4, UserId = adminUser.Id, CreatedAt = DateTime.UtcNow }
                };
                _context.QuestionDifficulties.AddRange(difficulties);
                _context.SaveChanges();
            }

            // 5. Seed Question Categories
            if (!_context.QuestionCategories.Any())
            {
                var categories = new List<QuestionCategory>
                {
                    // "Unspecified" is first to ensure it gets Id = 1
                    new QuestionCategory { Name = "Unspecified", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow },
                    new QuestionCategory { Name = "Science", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#2196F3", "#BBDEFB" }), Gradient = true },
                    new QuestionCategory { Name = "History", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#A1887F", "#D7CCC8" }) },
                    new QuestionCategory { Name = "Technology", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#455A64", "#CFD8DC" }), Gradient = true },
                    new QuestionCategory { Name = "Geography", UserId = adminUser.Id, CreatedAt = DateTime.UtcNow, ColorPaletteJson = JsonSerializer.Serialize(new[] { "#4CAF50", "#C8E6C9" }) }
                };
                _context.QuestionCategories.AddRange(categories);
                _context.SaveChanges();
            }

            // 6. Seed Sample Questions
            if (!_context.Questions.Any())
            {
                // Get Ids for seeded data
                var englishLangId = _context.QuestionLanguages.First(l => l.Language == "English").Id;
                var easyDiffId = _context.QuestionDifficulties.First(d => d.Level == "Easy").ID;
                var mediumDiffId = _context.QuestionDifficulties.First(d => d.Level == "Medium").ID;
                var historyCatId = _context.QuestionCategories.First(c => c.Name == "History").Id;
                var techCatId = _context.QuestionCategories.First(c => c.Name == "Technology").Id;
                var scienceCatId = _context.QuestionCategories.First(c => c.Name == "Science").Id;

                var questions = new List<QuestionBase>
                {
                    // Multiple Choice Question
                    new MultipleChoiceQuestion
                    {
                        Text = "What was the primary programming language used to create the first version of the Android OS?",
                        UserId = adminUser.Id,
                        Visibility = QuestionVisibility.Global,
                        LanguageId = englishLangId,
                        DifficultyId = mediumDiffId,
                        CategoryId = techCatId,
                        AnswerOptions = new List<AnswerOption>
                        {
                            new AnswerOption { Text = "Kotlin", IsCorrect = false },
                            new AnswerOption { Text = "Java", IsCorrect = true },
                            new AnswerOption { Text = "C++", IsCorrect = false },
                            new AnswerOption { Text = "Swift", IsCorrect = false }
                        }
                    },
                    // True/False Question
                    new TrueFalseQuestion
                    {
                        Text = "The Great Wall of China is visible from the Moon with the naked eye.",
                        UserId = adminUser.Id,
                        Visibility = QuestionVisibility.Global,
                        LanguageId = englishLangId,
                        DifficultyId = easyDiffId,
                        CategoryId = historyCatId,
                        CorrectAnswer = false
                    },
                    // Type The Answer Question
                    new TypeTheAnswerQuestion
                    {
                        Text = "What is the chemical symbol for water?",
                        UserId = adminUser.Id,
                        Visibility = QuestionVisibility.Global,
                        LanguageId = englishLangId,
                        DifficultyId = easyDiffId,
                        CategoryId = scienceCatId,
                        CorrectAnswer = "H2O",
                        IsCaseSensitive = false,
                        AcceptableAnswers = new List<string> { "h2o" }
                    }
                };

                _context.Questions.AddRange(questions);
                _context.SaveChanges();
            }
        }
    }
}