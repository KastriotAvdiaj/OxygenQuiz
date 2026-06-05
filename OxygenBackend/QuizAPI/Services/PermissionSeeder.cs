using Microsoft.EntityFrameworkCore;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using System.Collections.Generic;
using System.Linq;

namespace QuizAPI.Services
{
    public static class PermissionSeeder
    {
        public static void Seed(ModelBuilder modelBuilder)
        {
            // ── Permissions ──────────────────────────────────────────
            var permissions = new List<Permission>
            {
                // Questions
                new() { Id = 1,  Name = "question:view",       Description = "View questions" },
                new() { Id = 2,  Name = "question:create",     Description = "Create questions" },
                new() { Id = 3,  Name = "question:update:own", Description = "Update own questions" },
                new() { Id = 4,  Name = "question:delete:own", Description = "Delete own questions" },
                new() { Id = 12, Name = "question:update:any", Description = "Update any question" },
                new() { Id = 13, Name = "question:delete:any", Description = "Delete any question" },

                // Quizzes
                new() { Id = 5,  Name = "quiz:view",       Description = "View quizzes" },
                new() { Id = 6,  Name = "quiz:create",     Description = "Create quizzes" },
                new() { Id = 7,  Name = "quiz:update:own", Description = "Update own quizzes" },
                new() { Id = 8,  Name = "quiz:delete:own", Description = "Delete own quizzes" },
                new() { Id = 14, Name = "quiz:update:any", Description = "Update any quiz" },
                new() { Id = 15, Name = "quiz:delete:any", Description = "Delete any quiz" },

                // Users
                new() { Id = 9,  Name = "user:view",       Description = "View users" },
                new() { Id = 10, Name = "user:update:own", Description = "Update own profile settings" },
                new() { Id = 11, Name = "user:delete:any", Description = "Delete any user account" },
                new() { Id = 16, Name = "user:update:any", Description = "Update any user details" }
            };

            modelBuilder.Entity<Permission>().HasData(permissions);

            // ── Role → Permission assignments ────────────────────────

            // Superadmin (RoleId = 3) — Gets absolutely everything
            var superAdminPermissions = permissions
                .Select(p => new RolePermission { RoleId = 3, PermissionId = p.Id });

            // Admin (RoleId = 1) — Gets everything EXCEPT the ability to completely delete users
            var adminPermissions = permissions
                .Where(p => p.Name != "user:delete:any")
                .Select(p => new RolePermission { RoleId = 1, PermissionId = p.Id });

            // User (RoleId = 2) — Only gets view, create, and modification rights over their OWN assets
            var userPermissions = new[]
            {
                new RolePermission { RoleId = 2, PermissionId = 1 },  // question:view
                new RolePermission { RoleId = 2, PermissionId = 2 },  // question:create
                new RolePermission { RoleId = 2, PermissionId = 3 },  // question:update:own
                new RolePermission { RoleId = 2, PermissionId = 4 },  // question:delete:own
                
                new RolePermission { RoleId = 2, PermissionId = 5 },  // quiz:view
                new RolePermission { RoleId = 2, PermissionId = 6 },  // quiz:create
                new RolePermission { RoleId = 2, PermissionId = 7 },  // quiz:update:own
                new RolePermission { RoleId = 2, PermissionId = 8 },  // quiz:delete:own
                
                new RolePermission { RoleId = 2, PermissionId = 9 },  // user:view
                new RolePermission { RoleId = 2, PermissionId = 10 }, // user:update:own
            };

            // Combine and seed all relationship records
            modelBuilder.Entity<RolePermission>().HasData(
                superAdminPermissions
                    .Concat(adminPermissions)
                    .Concat(userPermissions)
                    .ToList()
            );
        }
    }
}