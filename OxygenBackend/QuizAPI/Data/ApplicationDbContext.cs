using Microsoft.EntityFrameworkCore;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Models.Statistics.Questions;
using System;

namespace QuizAPI.Data
{
    public class ApplicationDbContext : DbContext
    {

        public DbSet<User> Users { get; set; }

        public DbSet<Question> Questions { get; set; }

        public DbSet<Quiz> Quizzes { get; set; }

        public DbSet<QuizQuestion> QuizQuestions { get; set; }

        public DbSet<QuestionCategory> QuestionCategories { get; set; }
        public DbSet<QuestionLanguage> QuestionLanguages { get; set; }

        public DbSet<AnswerOption> AnswerOptions { get; set; }

        public DbSet<QuestionDifficulty> QuestionDifficulties { get; set; }

        public DbSet<Permission> Permissions { get; set; }

        public DbSet<Role> Roles { get; set; }

        public DbSet<UpdatedAt> UpdatedAt { get; set; }

        public DbSet<RoleUpdatedAt> RoleUpdatedAt { get; set; }

        public DbSet<PermissionUpdatedAt> PermissionUpdatedAt { get; set; }
        public DbSet<UserUpdatedAt> UserUpdatedAt { get; set; }

        public DbSet<QuestionStatistics> QuestionStatistics { get; set; }

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

            // Configure many-to-many relationship between User and UpdatedAt tables.
            modelBuilder.Entity<UserUpdatedAt>()
    .HasKey(ru => new { ru.UserId, ru.UpdatedAtId });

            modelBuilder.Entity<UserUpdatedAt>()
                .HasOne(ru => ru.User)
                .WithMany(r => r.UserUpdatedAt)
                .HasForeignKey(ru => ru.UserId)
                .OnDelete(DeleteBehavior.NoAction); // Or DeleteBehavior.NoAction

            modelBuilder.Entity<UserUpdatedAt>()
                .HasOne(ru => ru.UpdatedAt)
                .WithMany(u => u.UserUpdatedAt)
                .HasForeignKey(ru => ru.UpdatedAtId)
                .OnDelete(DeleteBehavior.NoAction); // Or DeleteBehavior.NoAction

            modelBuilder.Entity<UpdatedAt>()
                .HasOne(u => u.User)
                .WithMany()
                .HasForeignKey(u => u.UserId)
                .OnDelete(DeleteBehavior.NoAction);


            // Configuration for Question-AnswerOptions relationship
            modelBuilder.Entity<Question>()
            .HasMany(q => q.AnswerOptions)
            .WithOne(a => a.Question)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

            //Configuration for User-QuestionCategory relationship
            modelBuilder.Entity<QuestionCategory>()
       .HasOne(qc => qc.User)
       .WithMany()
       .HasForeignKey(qc => qc.UserId)
       .OnDelete(DeleteBehavior.Restrict);

            //Configuration for User-QuestionDifficulty relationship
            modelBuilder.Entity<QuestionDifficulty>()
       .HasOne(qd => qd.User)
       .WithMany()
       .HasForeignKey(qc => qc.UserId)
       .OnDelete(DeleteBehavior.Restrict);

        //Configuration for Question-QuestionLanguage relationship
        modelBuilder.Entity<Question>()
       .HasOne(ql => ql.Language)
       .WithMany()
       .HasForeignKey(ql => ql.LanguageId)
       .OnDelete(DeleteBehavior.Restrict);


        //Configuration for Quiz and User relationship
        modelBuilder.Entity<Quiz>().
        HasOne(q => q.User).
        WithMany().
        HasForeignKey(q => q.UserId).
        OnDelete(DeleteBehavior.Restrict);

            //Configuration for Quiz and User relationship
            modelBuilder.Entity<QuizQuestion>()
       .HasOne(qq => qq.Quiz)
       .WithMany(q => q.QuizQuestions)
       .HasForeignKey(qq => qq.QuizId)
       .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<QuizQuestion>()
                .HasOne(qq => qq.Question)
                .WithMany(q => q.QuizQuestions)
                .HasForeignKey(qq => qq.QuestionId)
                .OnDelete(DeleteBehavior.Restrict);
        }
}
}
