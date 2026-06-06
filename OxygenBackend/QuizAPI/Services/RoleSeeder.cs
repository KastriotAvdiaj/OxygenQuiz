using Microsoft.EntityFrameworkCore;
using QuizAPI.Models;

namespace QuizAPI.Services
{
    /// <summary>
    /// Model-based (HasData) seeding for the fixed role set. These IDs are referenced
    /// directly by <see cref="PermissionSeeder"/>'s RolePermission rows, so they must stay stable:
    /// Admin = 1, User = 2, SuperAdmin = 3.
    ///
    /// ConcurrencyStamp uses hardcoded GUIDs on purpose — a non-deterministic value
    /// (Guid.NewGuid()) would make EF think the seed changed on every build and emit a
    /// spurious migration each time.
    /// </summary>
    public static class RoleSeeder
    {
        public static void Seed(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Role>().HasData(
                new Role
                {
                    Id = 1,
                    Name = "Admin",
                    isActive = true,
                    Description = "Administrator",
                    ConcurrencyStamp = Guid.Parse("11111111-1111-1111-1111-111111111111")
                },
                new Role
                {
                    Id = 2,
                    Name = "User",
                    isActive = true,
                    Description = "Regular user",
                    ConcurrencyStamp = Guid.Parse("22222222-2222-2222-2222-222222222222")
                },
                new Role
                {
                    Id = 3,
                    Name = "SuperAdmin",
                    isActive = true,
                    Description = "Super Administrator",
                    ConcurrencyStamp = Guid.Parse("33333333-3333-3333-3333-333333333333")
                }
            );
        }
    }
}
