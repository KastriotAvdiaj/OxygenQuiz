using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Models
{
    public class User
    {
        public Guid Id { get; set; }

        public string ImmutableName { get; set; }
        public string Username { get; set; }

        public string Email { get; set; }

        // True once the user has proven they control their email via the confirmation link.
        // New signups start false; pre-existing accounts are backfilled to true by the
        // AddEmailVerification migration so they aren't retroactively nagged.
        public bool EmailConfirmed { get; set; }

        // Null for accounts created via an external provider (Google/Microsoft) that never set a
        // password. LoginAsync treats a null/empty hash as "invalid credentials" — it must never
        // reach BCrypt.Verify, which throws on a malformed stored hash.
        // See docs/auth/social-login-plan.md §2.5.
        public string? PasswordHash { get; set; }

        public DateTime DateRegistered { get; set; }

        public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

        // Navigation property to the collection of QuizSession
        public ICollection<QuizSession> QuizSessions { get; set; }

        public Guid ConcurrencyStamp { get; set; }

        public bool IsDeleted { get; set; }

        // A system row the application depends on and must never destroy: the seeded root admin
        // (the account every SuperAdmin grant descends from) and the shared guest-play placeholder
        // that every guest session's required UserId points at. A protected account cannot be
        // deleted, cannot have its roles changed, and cannot close its own account.
        //
        // Set by DbSeeder and by nothing else — there is no endpoint, DTO or admin action that can
        // turn it on or off, which is what makes it a guarantee rather than a default.
        // See docs/adr/0011-system-accounts-are-protected-rows.md.
        public bool IsProtected { get; set; }

        // Self-service account closure (docs/adr/0012-...). Three states, read together:
        //
        //   both null                          → active
        //   DeletionRequestedAt set, IsDeleted → closure requested, grace period running.
        //                                        Recoverable: signing in cancels it.
        //   AnonymisedAt set                   → scrubbed. The row survives so every foreign key
        //                                        still resolves, but nobody is in it any more.
        //
        // IsDeleted stays exactly what it was — the flag the global query filter reads — rather
        // than growing a third meaning. Which is also how an ADMIN deletion stays distinguishable
        // from a closure: IsDeleted with no DeletionRequestedAt is an admin removing an account,
        // and that one is a lockout with no way back in (see AuthenticationService.LoginAsync).
        public DateTime? DeletionRequestedAt { get; set; }

        public DateTime? AnonymisedAt { get; set; }

        public DateTime LastLogin { get; set; }


        public string? ProfileImageUrl { get; set; }

        // 1:1 per-user preferences (music, sound, theme, etc.)
        public UserSettings? Settings { get; set; }

        public User()
        {
            ConcurrencyStamp = Guid.NewGuid();
        }

    }
}
