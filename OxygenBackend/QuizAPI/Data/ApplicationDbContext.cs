using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Models.Statistics.Questions;
using System.Text.Json;
namespace QuizAPI.Data
{

    public class ApplicationDbContext : DbContext
    {
        private readonly ICurrentUserService _current;

        public DbSet<User> Users { get; set; }

        public DbSet<QuestionBase> Questions { get; set; }

        public DbSet<MultipleChoiceQuestion> MultipleChoiceQuestions { get; set; }
        public DbSet<TrueFalseQuestion> TrueFalseQuestions { get; set; }
        public DbSet<TypeTheAnswerQuestion> TypeTheAnswerQuestions { get; set; }

        public DbSet<Quiz> Quizzes { get; set; }

        public DbSet<QuizSession> QuizSessions { get; set; }

        public DbSet<UserAnswer> UserAnswers { get; set; }

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

        public DbSet<ImageAsset> ImageAssets { get; set; }

        public DbSet<Universiteti> Universitetet { get; set; }

        public DbSet<Drejtimi> Drejtimet { get; set; }

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ICurrentUserService current) : base(options)
        {
            _current = current;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            //INDEXES FOR DASHBOARD
            modelBuilder.Entity<Quiz>()
                .HasIndex(q => new { q.UserId, q.Visibility, q.Id });

            modelBuilder.Entity<QuestionBase>()
                .HasIndex(q => new { q.UserId, q.Visibility, q.Id });
            //INDEXES FOR DASHBOARD

            //GLOBAL QUERY FILTERS
            // Users: only see their own *or* public items by default
            modelBuilder.Entity<Quiz>().HasQueryFilter(q =>
                _current.IsAdmin || (
                    (_current.UserId != null) &&
                    (q.UserId == _current.UserId || q.Visibility != QuizVisibility.Private)
                )
            );

            modelBuilder.Entity<QuestionBase>().HasQueryFilter(q =>
                _current.IsAdmin ||                                 // 1. Admin can see everything.
                q.UserId == _current.UserId ||                      // 2. You can see questions you own.
                q.Visibility != QuestionVisibility.Private ||               // 3. You can see any public question.
                q.QuizQuestions.Any(qq =>                           // 4. OR the question is in a quiz you can see.
                    _current.UserId != null &&
                    (qq.Quiz.UserId == _current.UserId || qq.Quiz.Visibility == QuizVisibility.Public)
                )
        );

            //GLOBAL QUERY FILTERS


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
            modelBuilder.Entity<MultipleChoiceQuestion>()
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
            modelBuilder.Entity<QuestionBase>()
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



            //Configuration for Quiz and Question relationship
            modelBuilder.Entity<QuizQuestion>()
                .HasOne(qq => qq.Quiz)
                .WithMany(q => q.QuizQuestions)
                .HasForeignKey(qq => qq.QuizId);

            modelBuilder.Entity<QuizQuestion>()
                .HasOne(qq => qq.Question)
                .WithMany(q => q.QuizQuestions)
                .HasForeignKey(qq => qq.QuestionId);


            //Configuration for QuizSession and User/Quiz relationship
            modelBuilder.Entity<QuizSession>()
                .HasOne(qs => qs.Quiz)
                .WithMany() 
                .HasForeignKey(qs => qs.QuizId)
                .OnDelete(DeleteBehavior.Restrict); // Or Cascade, if deleting a quiz should delete its sessions

            modelBuilder.Entity<QuizSession>()
                .HasOne(qs => qs.User)
                .WithMany(u => u.QuizSessions) // Assuming a User can have many sessions
                .HasForeignKey(qs => qs.UserId)
                .OnDelete(DeleteBehavior.Restrict);


            //Configuration for QuizSession and UserAnswers relationship
            modelBuilder.Entity<UserAnswer>()
                .HasOne(ua => ua.QuizSession)
                .WithMany(qs => qs.UserAnswers)
                .HasForeignKey(ua => ua.SessionId)
                .OnDelete(DeleteBehavior.Restrict);

             modelBuilder.Entity<UserAnswer>()
                .HasOne(ua => ua.QuizQuestion)
                .WithMany(qq => qq.UserAnswers)
                .HasForeignKey(ua => ua.QuizQuestionId)
                .OnDelete(DeleteBehavior.Restrict);


            //Configuration for the Table-per-hierarchy (TPH) pattern
            modelBuilder.Entity<QuestionBase>()
                .HasDiscriminator(q => q.Type)
                .HasValue<MultipleChoiceQuestion>(QuestionType.MultipleChoice)
                .HasValue<TrueFalseQuestion>(QuestionType.TrueFalse)
                .HasValue<TypeTheAnswerQuestion>(QuestionType.TypeTheAnswer);


            modelBuilder.Entity<TypeTheAnswerQuestion>()
                .Property(e => e.AcceptableAnswers)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null))
                .Metadata.SetValueComparer(new ValueComparer<List<string>>(
                    (c1, c2) => c1.SequenceEqual(c2),
                    c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v != null ? v.GetHashCode() : 0)),
                    c => c.ToList()));


        }
    }
}
