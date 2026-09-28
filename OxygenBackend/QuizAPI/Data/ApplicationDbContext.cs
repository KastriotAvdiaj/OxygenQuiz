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

        // Associations format content (docs/quiz/associations.md).
        public DbSet<QuizAPI.Models.Associations.AssociationBoard> AssociationBoards { get; set; }
        public DbSet<QuizAPI.Models.Associations.AssociationColumn> AssociationColumns { get; set; }
        public DbSet<QuizAPI.Models.Associations.AssociationTile> AssociationTiles { get; set; }
        public DbSet<QuizAPI.Models.Associations.AssociationGame> AssociationGames { get; set; }
        public DbSet<QuizAPI.Models.Associations.AssociationGamePlayer> AssociationGamePlayers { get; set; }
        public DbSet<QuizAPI.Models.Associations.AssociationGameMove> AssociationGameMoves { get; set; }

        public DbSet<Quiz> Quizzes { get; set; }

        public DbSet<QuizSession> QuizSessions { get; set; }

        public DbSet<Match> Matches { get; set; }

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

        public DbSet<EmailVerificationToken> EmailVerificationTokens { get; set; }

        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
        public DbSet<EmailChangeToken> EmailChangeTokens { get; set; }

        public DbSet<InviteCode> InviteCodes { get; set; }

        public DbSet<ExternalLogin> ExternalLogins { get; set; }

        public DbSet<FileRecord> Files { get; set; }

        public DbSet<AuditLog> AuditLogs { get; set; }

        public DbSet<Notification> Notifications { get; set; }

        public DbSet<UserSettings> UserSettings { get; set; }

        /// <summary>AI generation quota + cost ledger. See docs/quiz/ai-quiz-generation-flow.md §4.</summary>
        public DbSet<Models.Ai.AiGenerationUsage> AiGenerationUsages { get; set; }


        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ICurrentUserService current) : base(options)
        {
            _current = current;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            //INDEXES FOR DASHBOARD
            modelBuilder.Entity<Quiz>()
                .HasIndex(q => new { q.UserId, q.Status, q.Id });

            modelBuilder.Entity<QuestionBase>()
                .HasIndex(q => new { q.UserId, q.Visibility, q.Id });
            //INDEXES FOR DASHBOARD

            // A share token, when present, must be unique so it can be looked up directly.
            // Filtered so the many quizzes without a token don't collide on NULL.
            modelBuilder.Entity<Quiz>()
                .HasIndex(q => q.ShareToken)
                .IsUnique()
                .HasFilter($"\"{nameof(Quiz.ShareToken)}\" IS NOT NULL");

            //GLOBAL QUERY FILTERS
            // There is deliberately NO visibility filter on Quiz. The only Quiz filter is soft delete
            // (declared further down). Draft / Unlisted / ownership are enforced explicitly at each
            // entry point — the catalogue's `Status == Public`, GetQuizById's Draft check,
            // IsPlayAuthorized, CanHostQuizAsync, the owner checks in QuizService.
            //
            // A visibility filter used to be declared here, and it never ran: in EF Core 8 a second
            // HasQueryFilter on the same entity replaces the first, and the soft-delete one came
            // second. Everything was built against soft delete alone. It must not be "restored":
            // query filters apply to included navigations, so a stranger's session on an Unlisted
            // quiz (played via share link) would load without its Quiz, and the Hangfire sweeps and
            // the match loop — which run with no current user — would lose every non-Public quiz.
            // See docs/adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md and
            // QuizAPI.Tests/Visibility/QuizQueryFilterTests.cs, which fails if one is added.

            // Rule 4 is the one to read carefully. It used to open with `_current.UserId != null &&`
            // wrapping BOTH halves of the OR, which meant an anonymous caller failed the clause
            // before it ever reached `Status == Public` — and "this question lives in a public
            // quiz" needs no signed-in user at all.
            //
            // The effect: a guest opening a Public quiz whose questions are Private matched none
            // of the four rules, so EF filtered the question out. The QuizQuestion join row has no
            // filter of its own, so `FirstAsync(...Include(qq => qq.Question))` in
            // QuizSessionService still returned a row — with `Question` null, because query
            // filters apply to included navigations too — and `ToCurrentQuestionDto` then threw a
            // NullReferenceException on `qq.Question.Text`, surfacing as a 500 from
            // `GET /{sessionId}/next-question`.
            //
            // That is not a niche case: both the AI import (QuizService.BuildAiQuestionEntity) and
            // the manual builder (DEFAULT_NEW_* in the frontend's constants.ts) create questions
            // Private, so *every* public quiz built from newly-authored questions was unplayable
            // while logged out. It read as an AI bug only because AI quizzes were the first ones
            // anyone opened in a signed-out tab. See docs/quiz/quiz-visibility.md.
            modelBuilder.Entity<QuestionBase>().HasQueryFilter(q =>
                _current.IsAdmin ||                                 // 1. Admin can see everything.
                q.UserId == _current.UserId ||                      // 2. You can see questions you own.
                q.Visibility != QuestionVisibility.Private ||       // 3. You can see any public question.
                q.QuizQuestions.Any(qq =>                           // 4. OR it's in a quiz you can see —
                    qq.Quiz.Status == QuizStatus.Public ||          //    public to everyone, guests included,
                    (_current.UserId != null &&                     //    or yours, which does need an account.
                     qq.Quiz.UserId == _current.UserId))
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

            // Uniqueness of email and names, enforced by the database and not only by the
            // app-level checks in UserRepository (EmailExistsAsync / NameTakenAsync), which two
            // concurrent requests can both pass. The indexes are PARTIAL, with the same filter those
            // checks use: a row counts while it is live or inside its closure grace period. An
            // admin-deleted row does not — its address and name are deliberately reusable (see
            // EmailExistsAsync) — and an anonymised row has had both rewritten to unique
            // deleted_* values anyway. A plain unique index would contradict that rule.
            //
            // The third index, on lower("Username"), is an expression index EF can't model; it is
            // created in the AddIdentityChanges migration's raw SQL. Case-insensitive, because
            // "Alice" and "alice" are the same name to a reader. The rule that a name must be free
            // ACROSS the two columns (my display name vs. your immutable one) is not something an
            // index can express, and stays app-level. See docs/adr/0017-one-namespace-for-names.md.
            const string countsForUniqueness =
                "NOT \"IsDeleted\" OR (\"DeletionRequestedAt\" IS NOT NULL AND \"AnonymisedAt\" IS NULL)";

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique()
                .HasFilter(countsForUniqueness);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.ImmutableName)
                .IsUnique()
                .HasFilter(countsForUniqueness);

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

            // Email verification tokens: one user -> many tokens, cascade on user delete, unique hash lookup.
            modelBuilder.Entity<EmailVerificationToken>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EmailVerificationToken>()
                .HasIndex(t => t.TokenHash)
                .IsUnique();

            // Password reset tokens: same shape as verification tokens, and a separate table on
            // purpose — see PasswordResetToken for why one table with a "purpose" column would be
            // a worse failure mode.
            modelBuilder.Entity<PasswordResetToken>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PasswordResetToken>()
                .HasIndex(t => t.TokenHash)
                .IsUnique();

            // Email-change tokens: a third twin, a third table (see EmailChangeToken).
            modelBuilder.Entity<EmailChangeToken>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EmailChangeToken>()
                .HasIndex(t => t.TokenHash)
                .IsUnique();

            // Invite codes: unique hash lookup; optional FK to the redeeming user (kept on user
            // delete so the audit trail survives — SetNull rather than Cascade).
            modelBuilder.Entity<InviteCode>()
                .HasIndex(c => c.CodeHash)
                .IsUnique();

            modelBuilder.Entity<InviteCode>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(c => c.ConsumedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            // The role a code grants on redemption. Restrict, not SetNull: silently downgrading a
            // pending Admin invite to a plain one because someone deleted the role would be a
            // surprise in the wrong direction. Revoke the outstanding codes first.
            modelBuilder.Entity<InviteCode>()
                .HasOne(c => c.GrantedRole)
                .WithMany()
                .HasForeignKey(c => c.GrantedRoleId)
                .OnDelete(DeleteBehavior.Restrict);

            // Redemption filters on this alongside the hash, and an admin looks up "who did I invite".
            modelBuilder.Entity<InviteCode>()
                .HasIndex(c => c.IntendedEmail);

            // External identity links (Google/Microsoft): looked up by the provider's stable
            // subject id, so that pair is the unique key. Cascade on user delete — a link is
            // meaningless without its user. One user may link several providers (UserId index).
            modelBuilder.Entity<ExternalLogin>()
                .HasIndex(el => new { el.Provider, el.ProviderSubjectId })
                .IsUnique();

            modelBuilder.Entity<ExternalLogin>()
                .HasIndex(el => el.UserId);

            modelBuilder.Entity<ExternalLogin>()
                .HasOne(el => el.User)
                .WithMany()
                .HasForeignKey(el => el.UserId)
                .OnDelete(DeleteBehavior.Cascade);

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

            // AI generation usage. The composite index matches the only hot query — "how many
            // slots has this user spent since the window opened" — which runs on every
            // generation request, inside a per-user lock, so it must not be a scan.
            // Like AuditLog, no FK to User: cost history should outlive the account.
            modelBuilder.Entity<Models.Ai.AiGenerationUsage>()
                .HasIndex(u => new { u.UserId, u.CreatedAt });
            // Serves the rolling 30-day spend cap.
            modelBuilder.Entity<Models.Ai.AiGenerationUsage>()
                .HasIndex(u => u.CreatedAt);

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

            // Soft delete: hide quizzes with a DeletedAt timestamp from every query automatically.
            // Played sessions / user answers are left untouched (their Quiz FK stays Restrict), so
            // history survives. Admin reads bypass this with IgnoreQueryFilters (see QuizRepository).
            // This is the ONLY query filter on Quiz — and EF Core 8 allows only one per entity: a
            // second HasQueryFilter call on Quiz would silently replace this one. See the note at the
            // top of the global query filters.
            modelBuilder.Entity<Quiz>().HasQueryFilter(q => q.DeletedAt == null);

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

            // Quiz editing is copy-on-write (docs/quiz/quiz-editing.md): retired join rows stay in the
            // table with RemovedInVersion set, so a question may legitimately appear twice for the
            // same quiz across versions. Uniqueness is therefore only enforced among LIVE rows.
            modelBuilder.Entity<QuizQuestion>()
                .HasIndex(qq => new { qq.QuizId, qq.QuestionId })
                .IsUnique()
                .HasFilter("\"RemovedInVersion\" IS NULL");



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


            // ── Multiplayer match (docs/quiz/multiplayer.md §7) ──
            // Restrict throughout, matching QuizSession's own rules and for the same reason: a
            // played game is a record, and a record that vanishes when a quiz or an account is
            // removed is not one. An anonymised account keeps its row and its id, so a match it
            // hosted or won still resolves — it just no longer names anybody.
            modelBuilder.Entity<Match>()
                .HasOne(m => m.Quiz)
                .WithMany()
                .HasForeignKey(m => m.QuizId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Match>()
                .HasOne(m => m.HostUser)
                .WithMany()
                .HasForeignKey(m => m.HostUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Match>()
                .HasOne(m => m.WinnerUser)
                .WithMany()
                .HasForeignKey(m => m.WinnerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // The sessions that make up a match. Restrict rather than cascade: deleting a match out
            // from under its sessions would orphan one player's answers from the others', and
            // nothing in the app deletes matches anyway.
            modelBuilder.Entity<QuizSession>()
                .HasOne(qs => qs.Match)
                .WithMany(m => m.Sessions)
                .HasForeignKey(qs => qs.MatchId)
                .OnDelete(DeleteBehavior.Restrict);

            // Every reader of match data starts from "the sessions in this match", and the analytics
            // mode filter scans a quiz's sessions by mode. Neither stays cheap unindexed once
            // matches are common.
            modelBuilder.Entity<QuizSession>()
                .HasIndex(qs => qs.MatchId);

            modelBuilder.Entity<QuizSession>()
                .HasIndex(qs => new { qs.QuizId, qs.Mode });

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


            ConfigureAssociationBoards(modelBuilder);
            ConfigureAssociationGames(modelBuilder);

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

        /// <summary>
        /// The Associations Board tables (docs/quiz/associations.md). Kept in its own method so the
        /// format's persistence reads as one unit.
        /// </summary>
        private static void ConfigureAssociationBoards(ModelBuilder modelBuilder)
        {
            // Same JSON-with-comparer shape as TypeTheAnswerQuestion.AcceptableAnswers: without the
            // comparer EF can't see an in-place list edit and silently skips the UPDATE.
            var listComparer = new ValueComparer<List<string>>(
                (a, b) => a!.SequenceEqual(b!),
                c => c.Aggregate(0, (acc, v) => HashCode.Combine(acc, v != null ? v.GetHashCode() : 0)),
                c => c.ToList());

            var board = modelBuilder.Entity<QuizAPI.Models.Associations.AssociationBoard>();
            board.Property(b => b.FinalAcceptableSolutions)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(listComparer);
            // Restrict, like every other FK to Quiz: a quiz is soft-deleted, never removed, and its
            // Boards are history that played games point at.
            board.HasOne(b => b.Quiz).WithMany().HasForeignKey(b => b.QuizId).OnDelete(DeleteBehavior.Restrict);
            // One live Board per quiz — the same filtered-unique shape as QuizQuestion's live rows.
            board.HasIndex(b => b.QuizId)
                .IsUnique()
                .HasFilter($"\"{nameof(QuizAPI.Models.Associations.AssociationBoard.RemovedInVersion)}\" IS NULL")
                .HasDatabaseName("IX_AssociationBoards_QuizId_Live");
            board.HasIndex(b => new { b.QuizId, b.CreatedInVersion });

            var column = modelBuilder.Entity<QuizAPI.Models.Associations.AssociationColumn>();
            column.Property(c => c.AcceptableSolutions)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(listComparer);
            column.HasOne(c => c.Board).WithMany(b => b.Columns).HasForeignKey(c => c.BoardId).OnDelete(DeleteBehavior.Cascade);
            column.HasIndex(c => new { c.BoardId, c.Position }).IsUnique();

            var tile = modelBuilder.Entity<QuizAPI.Models.Associations.AssociationTile>();
            tile.HasOne(t => t.Column).WithMany(c => c.Tiles).HasForeignKey(t => t.ColumnId).OnDelete(DeleteBehavior.Cascade);
            tile.HasIndex(t => new { t.ColumnId, t.Position }).IsUnique();
        }

        /// <summary>
        /// The Associations play tables (docs/quiz/associations.md, "Playing"; ADR 0020). A game is
        /// its move log: the game row and the players are the header, the moves are the record.
        /// </summary>
        private static void ConfigureAssociationGames(ModelBuilder modelBuilder)
        {
            var game = modelBuilder.Entity<QuizAPI.Models.Associations.AssociationGame>();
            // Restrict: a played game points at the exact Board version it was played on, and
            // copy-on-write never deletes Boards, so nothing should be able to remove one from under it.
            game.HasOne(g => g.Board).WithMany().HasForeignKey(g => g.BoardId).OnDelete(DeleteBehavior.Restrict);
            // Restrict, like QuizSession.MatchId: nothing deletes matches, and a match's games are its record.
            game.HasOne(g => g.Match).WithMany().HasForeignKey(g => g.MatchId).OnDelete(DeleteBehavior.Restrict);
            game.HasIndex(g => g.MatchId);
            game.Property(g => g.RulesJson).IsRequired();

            var player = modelBuilder.Entity<QuizAPI.Models.Associations.AssociationGamePlayer>();
            player.HasKey(p => new { p.GameId, p.SessionId });
            player.HasOne(p => p.Game).WithMany(g => g.Players).HasForeignKey(p => p.GameId).OnDelete(DeleteBehavior.Cascade);
            // Restrict from the session: deleting a session must go through the game (guest cleanup,
            // DeleteSessionAsync), or the game and its moves would be left behind with no player —
            // the exact silent leak docs/quiz/associations.md "Guests" warns about.
            player.HasOne(p => p.Session).WithMany().HasForeignKey(p => p.SessionId).OnDelete(DeleteBehavior.Restrict);
            // A session is one player's share of exactly one game.
            player.HasIndex(p => p.SessionId).IsUnique();

            var move = modelBuilder.Entity<QuizAPI.Models.Associations.AssociationGameMove>();
            move.HasOne(m => m.Game).WithMany(g => g.Moves).HasForeignKey(m => m.GameId).OnDelete(DeleteBehavior.Cascade);
            // The backstop against a double click: two requests that both read Seq n and append n+1
            // can't both commit. The service turns the violation into a 409.
            move.HasIndex(m => new { m.GameId, m.Seq }).IsUnique();
        }
    }
}
