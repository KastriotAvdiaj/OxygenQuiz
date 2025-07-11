using Bogus;
using QuizAPI.Models;

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

            var roleUser = _context.Roles.First(r => r.Name == "User");
            var roleAdmin = _context.Roles.First(r => r.Name == "Admin");
            var roleSuperAdmin = _context.Roles.First(r => r.Name == "SuperAdmin");

            // 2. Seed Users if none exist
            if (!_context.Users.Any())
            {
                var users = new List<User>();
                var faker = new Faker("en");

                // -- Add specific SuperAdmin
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

                // -- Add 1 fake Admin
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

                // -- Add hundreds of Users
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
        }
    }
}
