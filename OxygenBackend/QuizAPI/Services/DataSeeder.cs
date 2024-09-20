using QuizAPI.Models;
using System;
using System.Linq;

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
            SeedRoles();
            SeedUsers();
        }

        private void SeedRoles()
        {
            if (!_context.Roles.Any())
            {
                _context.Roles.AddRange(
                    new Role
                    {
                        Name = "Admin",
                        isActive = true,
                        Description = "Administrator role",
                        ConcurrencyStamp = Guid.NewGuid()
                    },
                    new Role
                    {
                        Name = "User",
                        isActive = true,
                        Description = "User role",
                        ConcurrencyStamp = Guid.NewGuid()
                    },
                    new Role
                    {
    
                        Name = "SuperAdmin",
                        isActive = true,
                        Description = "Super Administrator role",
                        ConcurrencyStamp = Guid.NewGuid()
                    }
                );

                _context.SaveChanges();
            }
        }

        private void SeedUsers()
        {
            if (!_context.Users.Any())
            {
                _context.Users.AddRange(
                    new User
                    {
                        Id = Guid.NewGuid(),
                        Username = "admin",
                        ImmutableName = "admin1",
                        Email = "admin@example.com",
                        RoleId = 1,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                        IsDeleted = false,
                        ConcurrencyStamp = Guid.NewGuid(),
                        DateRegistered = DateTime.UtcNow
                    },
                    new User
                    {
                        Id = Guid.NewGuid(),
                        Username = "user",
                        ImmutableName = "user1",
                        Email = "user@example.com",
                        RoleId = 2,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("user"),
                        IsDeleted = false,
                        ConcurrencyStamp = Guid.NewGuid(),
                        DateRegistered = DateTime.UtcNow
                    },
                     new User
                     {
                         Id = Guid.NewGuid(),
                         Username = "john_doe",
                         ImmutableName = "john1",
                         Email = "john.doe@example.com",
                         RoleId = 3,
                         PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                         IsDeleted = false,
                         ConcurrencyStamp = Guid.NewGuid(),
                         DateRegistered = DateTime.UtcNow
                     },
            new User
            {
                Id = Guid.NewGuid(),
                Username = "jane_smith",
                ImmutableName = "jane1",
                Email = "jane.smith@example.com",
                RoleId = 2,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("mypassword"),
                IsDeleted = false,
                ConcurrencyStamp = Guid.NewGuid(),
                DateRegistered = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Username = "peter_parker",
                ImmutableName = "peter1",
                Email = "peter.parker@example.com",
                RoleId = 2,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("spiderman"),
                IsDeleted = false,
                ConcurrencyStamp = Guid.NewGuid(),
                DateRegistered = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Username = "bruce_wayne",
                ImmutableName = "bruce1",
                Email = "bruce.wayne@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("batman"),
                IsDeleted = false,
                RoleId = 2,
                ConcurrencyStamp = Guid.NewGuid(),
                DateRegistered = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Username = "clark_kent",
                ImmutableName = "clark1",
                RoleId = 2,
                Email = "clark.kent@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("superman"),
                IsDeleted = false,
                ConcurrencyStamp = Guid.NewGuid(),
                DateRegistered = DateTime.UtcNow
            }
                );

                _context.SaveChanges();
            }
        }

    }
}
