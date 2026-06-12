using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Models.Statistics.Questions;
using QuizAPI.Services;
using QuizAPI.Services.CurrentUserService;
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

        public DbSet<UserRole> UserRoles { get; set; }
        
        public DbSet<RolePermission> RolePermissions { get; set; }

        public DbSet<QuizQuestion> QuizQuestions { get; set; }

        public DbSet<QuestionCategory> QuestionCategories { get; set; }
        public DbSet<QuestionLanguage> QuestionLanguages { get; set; }

        public DbSet<AnswerOption> AnswerOptions { get; set; }

        public DbSet<QuestionDifficulty> QuestionDifficulties { get; set; }

        public DbSet<Permission> Permissions { get; set; }

        public DbSet<Role> Roles { get; set; }

        public DbSet<QuestionStatistics> QuestionStatistics { get; set; }

        public DbSet<ImageAsset> ImageAssets { get; set; }

        public DbSet<RefreshToken> RefreshTokens { get; set; }

        public DbSet<FileRecord> Files { get; set; }

        public DbSet<AuditLog> AuditLogs { get; set; }

        public DbSet<Notification> Notifications { get; set; }

        public DbSet<UserSettings> UserSettings { get; set; }


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
                _current.IsAdmin ||
                q.Visibility != QuizVisibility.Private || // Public quizzes visible to everyone
                (_current.UserId != null && q.UserId == _current.UserId) // Own private quizzes only if authenticated
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

            // Static reference data (model-based seeding). Roles first: PermissionSeeder's
            // RolePermission rows reference these role IDs (Admin=1, User=2, SuperAdmin=3).
            RoleSeeder.Seed(modelBuilder);
            PermissionSeeder.Seed(modelBuilder);


            // USER config

            modelBuilder.Entity<User>()
                .Property(u => u.ConcurrencyStamp)
                .IsConcurrencyToken();

            modelBuilder.Entity<User>()
                .HasQueryFilter(u => !u.IsDeleted);

            //User - Role many-to-many relationship

            modelBuilder.Entity<UserRole>()
                .HasKey(ur => ur.Id);
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            // Wire the inverse (r => r.UserRoles) so this maps to the real RoleId FK.
            // Leaving WithMany() empty made EF invent a shadow "RoleId1" key for
            // Role.UserRoles (same flaw we fixed on RolePermission).
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            // Per-user settings: 1:1 with User, shared primary key (UserId), cascade on delete.
            modelBuilder.Entity<UserSettings>()
                .HasKey(s => s.UserId);
            modelBuilder.Entity<UserSettings>()
                .HasOne(s => s.User)
                .WithOne(u => u.Settings)
                .HasForeignKey<UserSettings>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Refresh tokens: one user -> many tokens, cascade on user delete, unique hash lookup.
            modelBuilder.Entity<RefreshToken>()
                .HasOne(rt => rt.User)
                .WithMany()
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RefreshToken>()
                .HasIndex(rt => rt.TokenHash)
                .IsUnique();

            // Generic file records: index the polymorphic owner for fast lookups.
            modelBuilder.Entity<FileRecord>()
                .HasIndex(f => new { f.Entity, f.EntityId });

            // INDEXES AND RELATIONSHIPS FOR ROLE PERMISSIONS
            modelBuilder.Entity<RolePermission>()
    .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            // Configure the Role side (One Role -> Many RolePermissions).
            // IMPORTANT: wire the inverse navigation (r => r.RolePermissions) so this
            // maps to the real RoleId FK. Leaving WithMany() empty made EF create a
            // separate relationship with a shadow "RoleId1" key, so role.RolePermissions
            // always loaded empty and every permission check failed.
            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure the Permission side (One Permission -> Many RolePermissions)
            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            base.OnModelCreating(modelBuilder);

            // Audit log: index the common query axes (who / which entity / when).
            modelBuilder.Entity<AuditLog>()
                .HasIndex(a => new { a.Entity, a.EntityId });
            modelBuilder.Entity<AuditLog>()
                .HasIndex(a => a.UserId);
            modelBuilder.Entity<AuditLog>()
                .HasIndex(a => a.CreatedAt);

            // Notifications: one user -> many, cascade on user delete, fast "my unread" lookups.
            modelBuilder.Entity<Notification>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Notification>()
                .HasIndex(n => new { n.UserId, n.IsRead });


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
