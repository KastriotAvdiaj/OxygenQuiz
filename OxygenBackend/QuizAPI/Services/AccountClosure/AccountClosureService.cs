using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.Data;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Email;

namespace QuizAPI.Services.AccountClosure
{
    /// <summary>
    /// Implements ADR 0012. Three operations and one invariant: the row survives, the person does
    /// not stay in it.
    ///
    /// <para><b>Why this touches DbContext directly.</b> Anonymisation spans seven tables —
    /// the user row plus six kinds of auth material — and is one atomic act; routing it through
    /// per-entity repositories would spread a single transaction across interfaces that exist to
    /// serve unrelated read paths. This is the one place in the codebase where that is the right
    /// call, and it is deliberate rather than a lapse.</para>
    /// </summary>
    public sealed class AccountClosureService : IAccountClosureService
    {
        private readonly ApplicationDbContext _db;
        private readonly IAuditService _audit;
        private readonly AccountClosureOptions _options;
        private readonly ILogger<AccountClosureService> _logger;
        private readonly IEmailSender _email;
        private readonly IConfiguration _configuration;

        public AccountClosureService(
            ApplicationDbContext db,
            IAuditService audit,
            IOptions<AccountClosureOptions> options,
            ILogger<AccountClosureService> logger,
            IEmailSender email,
            IConfiguration configuration)
        {
            _db = db;
            _audit = audit;
            _options = options.Value;
            _logger = logger;
            _email = email;
            _configuration = configuration;
        }

        public async Task<DateTime> RequestClosureAsync(Guid userId, CancellationToken ct = default)
        {
            // IgnoreQueryFilters: a pending closure sets IsDeleted, so a second request from a
            // client that hasn't noticed yet would otherwise 404 instead of answering idempotently.
            var user = await _db.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new NotFoundException("Account not found.");

            // Root and the guest placeholder. Root's escape hatch is promoting a successor and
            // moving the flag in the database — deliberately not a thing the app can do (ADR 0011).
            if (user.IsProtected)
                throw new ForbiddenException("This is a system account and can't be closed.");

            if (user.AnonymisedAt is not null)
                throw new ForbiddenException("This account has already been closed.");

            if (user.DeletionRequestedAt is DateTime already)
                return already.AddDays(_options.GracePeriodDays);

            var now = DateTime.UtcNow;
            user.DeletionRequestedAt = now;

            // IsDeleted is what the global query filter reads, so setting it here is what makes the
            // account disappear from every list and lookup during the grace period. Login is the one
            // path that deliberately looks past the filter, so that signing in can cancel this —
            // see AuthenticationService.LoginAsync.
            user.IsDeleted = true;

            // Invalidate anything keyed off the old identity; existing refresh tokens are revoked
            // below so the session cannot be silently extended past the request.
            user.ConcurrencyStamp = Guid.NewGuid();

            // RemoveRange rather than ExecuteDeleteAsync throughout this file: the latter is a
            // separate statement that bypasses the change tracker and commits on its own, so it
            // would delete the tokens even if the SaveChanges below failed — and the in-memory
            // provider the unit tests run on does not implement it at all.
            _db.RefreshTokens.RemoveRange(
                await _db.RefreshTokens.Where(t => t.UserId == userId).ToListAsync(ct));

            await _db.SaveChangesAsync(ct);

            var anonymiseAt = now.AddDays(_options.GracePeriodDays);

            await _audit.LogAsync(
                AuditActions.AccountClosureRequested,
                entity: "User",
                entityId: userId.ToString(),
                newValue: new { RequestedAt = now, AnonymiseAt = anonymiseAt },
                userId: userId,
                ct: ct);

            return anonymiseAt;
        }

        public async Task<bool> CancelClosureAsync(Guid userId, CancellationToken ct = default)
        {
            var user = await _db.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            // Nothing pending is the common case — this runs on every login.
            if (user is null || user.DeletionRequestedAt is null || user.AnonymisedAt is not null)
                return false;

            user.DeletionRequestedAt = null;
            user.IsDeleted = false;

            // Cleared, not kept: leaving it set would silence the warning for someone who comes
            // back, changes their mind again months later, and this time does stay away.
            user.ClosureReminderSentAt = null;

            await _db.SaveChangesAsync(ct);

            await _audit.LogAsync(
                AuditActions.AccountClosureCancelled,
                entity: "User",
                entityId: userId.ToString(),
                userId: userId,
                ct: ct);

            return true;
        }

        public async Task<int> AnonymisePendingAsync(CancellationToken ct = default)
        {
            var cutoff = DateTime.UtcNow.AddDays(-_options.GracePeriodDays);

            var due = await _db.Users.IgnoreQueryFilters()
                .Where(u => u.DeletionRequestedAt != null
                         && u.DeletionRequestedAt <= cutoff
                         && u.AnonymisedAt == null
                         && !u.IsProtected)
                .OrderBy(u => u.DeletionRequestedAt)
                .Take(_options.SweepBatchSize)
                .ToListAsync(ct);

            foreach (var user in due)
                await AnonymiseAsync(user, ct);

            if (due.Count > 0)
                _logger.LogInformation("Anonymised {Count} closed account(s).", due.Count);

            return due.Count;
        }

        /// <summary>
        /// The last warning. Sends to every account whose scrub is <c>ReminderDaysBefore</c> days
        /// away and that hasn't been warned, then stamps the row so the next hourly run skips it.
        ///
        /// <para><b>Sent, then stamped, one row at a time.</b> The stamp is what makes the mail
        /// exactly-once, so it must not be written before the provider has accepted the message —
        /// a crash between the two would cost someone their only warning. The other order costs a
        /// duplicate email in the same situation, which is the cheaper failure. One
        /// <c>SaveChanges</c> per person for the same reason: a batch that throws on its last
        /// address must not un-stamp the fifty that already went.</para>
        ///
        /// <para><b>A failed send is left unstamped on purpose</b>, so the next run retries it. A
        /// permanently bad address therefore retries hourly until the scrub removes the row from the
        /// query — noisy in the log, which is the right place for "we cannot reach this person".</para>
        /// </summary>
        public async Task<int> SendClosureRemindersAsync(CancellationToken ct = default)
        {
            // A warning that arrives after the data is gone is not a warning. Rather than sending it
            // late, an out-of-range setting turns the reminder off — 0 is how you do that on purpose.
            if (_options.ReminderDaysBefore <= 0 ||
                _options.ReminderDaysBefore >= _options.GracePeriodDays)
                return 0;

            // Due once the closure is old enough that only ReminderDaysBefore of the grace period
            // is left. Expressed against DeletionRequestedAt rather than "days until the scrub",
            // because that is the column the index and every other query in this file work on.
            var requestedOnOrBefore = DateTime.UtcNow
                .AddDays(-(_options.GracePeriodDays - _options.ReminderDaysBefore));

            var due = await _db.Users.IgnoreQueryFilters()
                .Where(u => u.DeletionRequestedAt != null
                         && u.DeletionRequestedAt <= requestedOnOrBefore
                         && u.AnonymisedAt == null
                         && u.ClosureReminderSentAt == null
                         && !u.IsProtected)
                .OrderBy(u => u.DeletionRequestedAt)
                .Take(_options.SweepBatchSize)
                .ToListAsync(ct);

            var sent = 0;

            foreach (var user in due)
            {
                var anonymiseAt = user.DeletionRequestedAt!.Value.AddDays(_options.GracePeriodDays);
                var daysLeft = Math.Max(1, (int)Math.Ceiling((anonymiseAt - DateTime.UtcNow).TotalDays));

                try
                {
                    // The button is the login page, because logging in IS the recovery — there is no
                    // token to mint and nothing to click that a stolen mail could abuse. Worth
                    // noticing: this is the one email we send whose link needs no secret at all.
                    var (html, text) = EmailTemplates.Action(
                        recipientName: user.Username,
                        preheader: $"{daysLeft} day(s) left to keep your account.",
                        intro: $"You asked us to close your Oxygen Quiz account. In {daysLeft} day(s) " +
                               "we permanently delete the personal data on it — your quizzes and play " +
                               "history stay, but the account itself can no longer be recovered. " +
                               "If you've changed your mind, just log in and it's cancelled.",
                        buttonLabel: "Log in and keep my account",
                        url: $"{AppLinks.FrontendBaseUrl(_configuration)}/login",
                        footer: "If you still want the account closed, do nothing — this is the only " +
                                "reminder we'll send.");

                    await _email.SendAsync(
                        user.Email, "Your Oxygen Quiz account is about to be deleted", html, text, ct);
                }
                catch (Exception ex)
                {
                    // One unreachable address must not cost everyone behind it in the batch their
                    // warning, so this is caught rather than thrown: unstamped, retried next hour.
                    _logger.LogError(ex, "Closure reminder failed for user {UserId}.", user.Id);
                    continue;
                }

                user.ClosureReminderSentAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                sent++;

                await _audit.LogAsync(
                    AuditActions.AccountClosureReminderSent,
                    entity: "User",
                    entityId: user.Id.ToString(),
                    newValue: new { AnonymiseAt = anonymiseAt },
                    userId: user.Id,
                    ct: ct);
            }

            if (sent > 0)
                _logger.LogInformation("Sent {Count} account-closure reminder(s).", sent);

            return sent;
        }

        /// <summary>
        /// The scrub itself. What leaves and what stays is the substance of ADR 0012: identity and
        /// the means to sign in go; play history, authored content and audit entries stay, because
        /// once the identity is gone they are no longer personal data — and because a quiz author's
        /// analytics should not change when a stranger closes their account.
        /// </summary>
        private async Task AnonymiseAsync(User user, CancellationToken ct)
        {
            var originalEmail = user.Email;
            var short_ = user.Id.ToString("N")[..8];

            // A unique, syntactically valid address on a reserved-by-RFC-2606 TLD that can never
            // receive mail. Unique because Email carries a uniqueness check, and .invalid so that
            // anything which ever tries to send here fails loudly rather than reaching a stranger.
            user.Email = $"deleted-{user.Id:N}@deleted.invalid";
            user.Username = $"deleted_user_{short_}";
            user.ImmutableName = $"deleted_user_{short_}";
            user.PasswordHash = null;
            user.ProfileImageUrl = string.Empty;
            user.EmailConfirmed = false;
            user.AnonymisedAt = DateTime.UtcNow;
            user.ConcurrencyStamp = Guid.NewGuid();

            // Auth material is hard-deleted rather than scrubbed: none of it has any value once the
            // account can't be signed into, and a stale token row is a liability, not a record.
            // One SaveChanges covers the scrub and all five deletions, so an account is never left
            // half-anonymised — with its identity gone but a live refresh token still outstanding.
            _db.RefreshTokens.RemoveRange(
                await _db.RefreshTokens.Where(t => t.UserId == user.Id).ToListAsync(ct));
            _db.ExternalLogins.RemoveRange(
                await _db.ExternalLogins.Where(l => l.UserId == user.Id).ToListAsync(ct));
            _db.PasswordResetTokens.RemoveRange(
                await _db.PasswordResetTokens.Where(t => t.UserId == user.Id).ToListAsync(ct));
            _db.EmailVerificationTokens.RemoveRange(
                await _db.EmailVerificationTokens.Where(t => t.UserId == user.Id).ToListAsync(ct));
            _db.UserSettings.RemoveRange(
                await _db.UserSettings.Where(s => s.UserId == user.Id).ToListAsync(ct));

            await _db.SaveChangesAsync(ct);

            // The audit entry keeps the user id — it is the record OF the deletion, and an
            // unattributable one would make the single action most worth being able to prove the
            // one action least provable. It does not keep the address it is reporting the loss of.
            await _audit.LogAsync(
                AuditActions.AccountAnonymised,
                entity: "User",
                entityId: user.Id.ToString(),
                newValue: new { EmailDomain = DomainOf(originalEmail) },
                userId: user.Id,
                ct: ct);
        }

        /// <summary>
        /// Everything after the @, or null. Kept so "which providers do people leave from" stays
        /// answerable; the local part, which is the identifying half, is not kept.
        /// </summary>
        private static string? DomainOf(string? email)
        {
            var at = email?.LastIndexOf('@') ?? -1;
            return at >= 0 ? email![(at + 1)..] : null;
        }
    }
}
