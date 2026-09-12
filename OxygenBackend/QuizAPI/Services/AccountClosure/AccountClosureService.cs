using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuizAPI.Data;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Services.Audit;

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

        public AccountClosureService(
            ApplicationDbContext db,
            IAuditService audit,
            IOptions<AccountClosureOptions> options,
            ILogger<AccountClosureService> logger)
        {
            _db = db;
            _audit = audit;
            _options = options.Value;
            _logger = logger;
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
