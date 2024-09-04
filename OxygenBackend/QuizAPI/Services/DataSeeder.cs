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

        /*private void SeedUsers()
        {
            if (!_context.Users.Any())
            {
                _context.Users.AddRange(
                    new User
                    {
                        Id = 1,
                        Username = "admin",
                        Email = "admin@example.com",
                        PasswordHash = "hashed_password",
                        isActive = true,
                        ConcurrencyStamp = Guid.NewGuid(),
                        DateRegistered = DateTime.UtcNow
                    },
                    new User
                    {
                        Id = 2,
                        Username = "user",
                        Email = "user@example.com",
                        PasswordHash = "hashed_password",
                        isActive = true,
                        ConcurrencyStamp = Guid.NewGuid(),
                        DateRegistered = DateTime.UtcNow
                    }
                );

                _context.SaveChanges();
            }
        }*/

    }
}
