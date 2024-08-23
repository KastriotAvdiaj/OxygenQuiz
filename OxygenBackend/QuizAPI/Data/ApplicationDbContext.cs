using Microsoft.EntityFrameworkCore;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;

namespace QuizAPI.Data
{
    public class ApplicationDbContext : DbContext
    {

        public DbSet<User> Users { get; set; }

        public DbSet<Permission> Permissions { get; set; }

        public DbSet<Role> Roles { get; set; }

        public DbSet<UpdatedAt> UpdatedAt { get; set; }

        public DbSet<RoleUpdatedAt> RoleUpdatedAt { get; set; }

        public DbSet<PermissionUpdatedAt> PermissionUpdatedAt { get; set; }

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        { 
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure many-to-many relationship between Role and UpdatedAt tables.
            modelBuilder.Entity<RoleUpdatedAt>()
                .HasKey(ru => new { ru.RoleId, ru.UpdatedAtId });

            modelBuilder.Entity<RoleUpdatedAt>()
                .HasOne(ru => ru.Role)
                .WithMany(r => r.RoleUpdatedAt)
                .HasForeignKey(ru => ru.RoleId);

            modelBuilder.Entity<RoleUpdatedAt>()
                .HasOne(ru => ru.UpdatedAt)
                .WithMany(u => u.RoleUpdatedAt)
                .HasForeignKey(ru => ru.UpdatedAtId);

            // Configure many-to-many relationship between Permission and UpdatedAt tables.
            modelBuilder.Entity<PermissionUpdatedAt>()
                .HasKey(ru => new { ru.PermissionId, ru.UpdatedAtId });

            modelBuilder.Entity<PermissionUpdatedAt>()
                .HasOne(ru => ru.Permission)
                .WithMany(r => r.PermissionUpdatedAt)
                .HasForeignKey(ru => ru.PermissionId);

            modelBuilder.Entity<PermissionUpdatedAt>()
                .HasOne(ru => ru.UpdatedAt)
                .WithMany(u => u.PermissionUpdatedAt)
                .HasForeignKey(ru => ru.UpdatedAtId);
        }
    }
}
