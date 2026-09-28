using Microsoft.EntityFrameworkCore;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.Email;

namespace QuizAPI.Services.AccountIdentity
{
    /// <summary>
    /// Email and display-name changes. See docs/auth/account-identity-changes.md for the flow and
    /// docs/adr/0017-one-namespace-for-names.md for the naming rule.
    /// </summary>
    public sealed class AccountIdentityService(
        IUserRepository userRepository,
        IEmailChangeTokenRepository emailChangeTokenRepository,
        IPasswordResetTokenRepository passwordResetTokenRepository,
        IEmailVerificationTokenRepository emailVerificationTokenRepository,
        ITokenService tokenService,
        IEmailSender emailSender,
        IAuditService auditService,
        IConfiguration configuration) : IAccountIdentityService
    {
        /// <summary>
        /// How long a display name must stand before it can change again. Long enough that a name
        /// is something people can learn and rely on, and that nobody can cycle through names to
        /// confuse a lobby; short enough that a regretted choice isn't a life sentence.
        /// </summary>
        public static readonly TimeSpan UsernameChangeCooldown = TimeSpan.FromDays(30);

        private const string InvalidLinkMessage = "Invalid or expired confirmation link.";

        // ── Read ────────────────────────────────────────────────────────────────────────────

        public async Task<AccountIdentityDTO> GetIdentityAsync(Guid userId, CancellationToken ct = default)
        {
            var user = await userRepository.GetByIdAsync(userId, tracked: false, ct)
                ?? throw new NotFoundException("Account not found.");
            var pending = await emailChangeTokenRepository.GetActiveForUserAsync(userId, ct);
            return ToIdentity(user, pending?.NewEmail);
        }

        // ── Email ───────────────────────────────────────────────────────────────────────────

        /// <remarks>
        /// Why each check is here:
        /// <list type="bullet">
        ///   <item><description><b>Current password.</b> A signed-in session is not enough: a
        ///     stolen or unattended one could otherwise move the recovery address and then reset
        ///     the password from the new inbox — a permanent takeover. Accounts with no password
        ///     (Google/Microsoft-only) must set one first, through the reset link, for the same
        ///     reason.</description></item>
        ///   <item><description><b>Nothing changes yet.</b> The link goes to the NEW address and
        ///     the swap happens only when it is redeemed, so a typo can't strand the account on an
        ///     address nobody reads.</description></item>
        ///   <item><description><b>"Already in use" is said out loud.</b> Unlike forgot-password,
        ///     this caller is authenticated and password-checked, and the anonymous availability
        ///     endpoint answers the same question already.</description></item>
        /// </list>
        /// Every failure is a 400, never a 401: the frontend treats 401 as "refresh the session".
        /// </remarks>
        public async Task RequestEmailChangeAsync(
            Guid userId, string newEmail, string currentPassword, CancellationToken ct = default)
        {
            var user = await userRepository.GetByIdAsync(userId, tracked: false, ct)
                ?? throw new NotFoundException("Account not found.");

            if (string.IsNullOrEmpty(user.PasswordHash))
                throw new AppValidationException(
                    "Set a password first — use Change password below — then change your email.");

            if (string.IsNullOrEmpty(currentPassword) ||
                !BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
                throw new AppValidationException("Your current password is incorrect.");

            var address = (newEmail ?? string.Empty).Trim();
            if (address.Length == 0)
                throw new AppValidationException("Enter the new email address.");

            if (string.Equals(address, user.Email, StringComparison.OrdinalIgnoreCase))
                throw new AppValidationException("That's already your email address.");

            if (await userRepository.EmailExistsAsync(address, ct))
                throw new ConflictException("That email address is already used by another account.");

            // Asking again replaces the pending address: one live link per account.
            await emailChangeTokenRepository.InvalidateActiveForUserAsync(user.Id, ct);

            var (raw, hash, expiresAt) = tokenService.GenerateEmailChangeToken();
            await emailChangeTokenRepository.AddAsync(new EmailChangeToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                NewEmail = address,
                TokenHash = hash,
                ExpiresAt = expiresAt,
                CreatedAt = DateTime.UtcNow,
            }, ct);
            await emailChangeTokenRepository.SaveChangesAsync(ct);

            var link = $"{AppLinks.FrontendBaseUrl(configuration)}/confirm-email-change?token={Uri.EscapeDataString(raw)}";
            var (html, text) = EmailTemplates.Action(
                recipientName: user.Username,
                preheader: "Confirm your new address. The link is valid for one hour.",
                intro: "You asked to move your Oxygen Quiz account to this email address. " +
                       "Confirm it and this is where we'll write to you from now on.",
                buttonLabel: "Confirm new email",
                url: link,
                footer: "This link expires in 1 hour and can only be used once. If you didn't " +
                        "ask for this, ignore this email — nothing changes unless it is clicked.");

            await emailSender.SendAsync(address, "Confirm your new Oxygen Quiz email", html, text, ct);

            await auditService.LogAsync(
                AuditActions.EmailChangeRequested, entity: "User", entityId: user.Id.ToString(),
                newValue: new { NewEmail = address }, userId: user.Id, ct: ct);
        }

        public async Task CancelEmailChangeAsync(Guid userId, CancellationToken ct = default)
        {
            await emailChangeTokenRepository.InvalidateActiveForUserAsync(userId, ct);
            await emailChangeTokenRepository.SaveChangesAsync(ct);
        }

        /// <remarks>
        /// Besides the swap, three things happen, each load-bearing:
        /// <list type="bullet">
        ///   <item><description><b>The new address counts as confirmed</b> — redeeming the link is
        ///     exactly that proof.</description></item>
        ///   <item><description><b>Outstanding reset, verification and change links die.</b> A
        ///     reset link already sitting in the OLD inbox would otherwise still hand the account
        ///     to whoever reads that inbox after the owner has moved away from it.</description></item>
        ///   <item><description><b>The old address is told.</b> If the change wasn't the owner's,
        ///     that mail is how they find out.</description></item>
        /// </list>
        /// Sessions are not revoked: the change was password-gated, and signing the owner out of
        /// the device they just used to confirm would read as a failure. The address is re-checked
        /// here, not only at request time — someone may have registered it in the last hour.
        /// </remarks>
        public async Task ConfirmEmailChangeAsync(string rawToken, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(rawToken))
                throw new AppValidationException(InvalidLinkMessage);

            var stored = await emailChangeTokenRepository.GetActiveByHashAsync(
                tokenService.HashToken(rawToken), ct)
                ?? throw new AppValidationException(InvalidLinkMessage);

            var user = await userRepository.GetByIdAsync(stored.UserId, tracked: true, ct)
                ?? throw new AppValidationException(InvalidLinkMessage);

            if (await userRepository.EmailExistsAsync(stored.NewEmail, ct))
            {
                stored.ConsumedAt = DateTime.UtcNow;
                await emailChangeTokenRepository.SaveChangesAsync(ct);
                throw new ConflictException(
                    "That email address was registered by another account in the meantime.");
            }

            var oldEmail = user.Email;

            user.Email = stored.NewEmail;
            user.EmailConfirmed = true;
            user.ConcurrencyStamp = Guid.NewGuid();

            // Consumes this token too (it is one of the user's active ones).
            await emailChangeTokenRepository.InvalidateActiveForUserAsync(user.Id, ct);
            await passwordResetTokenRepository.InvalidateActiveForUserAsync(user.Id, ct);
            await emailVerificationTokenRepository.InvalidateActiveForUserAsync(user.Id, ct);

            // All four repositories share the scoped DbContext, so this one save lands the swap and
            // every invalidation together.
            try
            {
                await userRepository.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // The partial unique index on Email — a signup that won the race with the check above.
                throw new ConflictException(
                    "That email address was registered by another account in the meantime.");
            }

            var (html, text) = EmailTemplates.Action(
                recipientName: user.Username,
                preheader: "The email on your account was just changed.",
                intro: $"The email address on your Oxygen Quiz account was changed to " +
                       $"{MaskEmail(user.Email)}. If you did this, there is nothing to do. If you " +
                       "didn't, someone has your password — sign in and change it, or contact us.",
                buttonLabel: "Review your account",
                url: $"{AppLinks.FrontendBaseUrl(configuration)}/settings/account",
                footer: "You're receiving this at your previous address so that you hear about " +
                        "the change even if it wasn't you.");

            await emailSender.SendAsync(oldEmail, "Your Oxygen Quiz email was changed", html, text, ct);

            await auditService.LogAsync(
                AuditActions.EmailChanged, entity: "User", entityId: user.Id.ToString(),
                oldValue: new { Email = oldEmail }, newValue: new { user.Email },
                userId: user.Id, ct: ct);
        }

        // ── Display name ────────────────────────────────────────────────────────────────────

        public async Task<AccountIdentityDTO> ChangeUsernameAsync(
            Guid userId, string newUsername, CancellationToken ct = default)
        {
            var user = await userRepository.GetByIdAsync(userId, tracked: true, ct)
                ?? throw new NotFoundException("Account not found.");

            var name = (newUsername ?? string.Empty).Trim();
            if (name.Length is < 3 or > 50)
                throw new AppValidationException("Usernames are 3 to 50 characters.");

            if (name == user.Username)
                return ToIdentity(user, pendingEmail: null);

            // A change of case only ("alice" → "Alice") is the same name and not worth a cooldown.
            var caseOnly = string.Equals(name, user.Username, StringComparison.OrdinalIgnoreCase);

            if (!caseOnly)
            {
                var next = NextUsernameChangeAt(user);
                if (next is not null)
                    throw new AppValidationException(
                        $"You can change your username again on {next.Value:MMMM d, yyyy}.");

                if (await userRepository.NameTakenAsync(name, exceptUserId: user.Id, ct))
                    throw new ConflictException("That username is taken.");
            }

            var oldName = user.Username;
            user.Username = name;
            if (!caseOnly) user.UsernameChangedAt = DateTime.UtcNow;
            user.ConcurrencyStamp = Guid.NewGuid();

            try
            {
                await userRepository.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // The lower("Username") unique index — someone took it between check and save.
                throw new ConflictException("That username is taken.");
            }

            await auditService.LogAsync(
                AuditActions.UsernameChanged, entity: "User", entityId: user.Id.ToString(),
                oldValue: new { Username = oldName }, newValue: new { user.Username },
                userId: user.Id, ct: ct);

            var pending = await emailChangeTokenRepository.GetActiveForUserAsync(userId, ct);
            return ToIdentity(user, pending?.NewEmail);
        }

        // ── Helpers ─────────────────────────────────────────────────────────────────────────

        private static DateTime? NextUsernameChangeAt(User user)
        {
            if (user.UsernameChangedAt is null) return null;
            var next = user.UsernameChangedAt.Value + UsernameChangeCooldown;
            return next > DateTime.UtcNow ? next : null;
        }

        private static AccountIdentityDTO ToIdentity(User user, string? pendingEmail) => new()
        {
            Username = user.Username,
            HasPassword = !string.IsNullOrEmpty(user.PasswordHash),
            PendingEmail = pendingEmail,
            NextUsernameChangeAt = NextUsernameChangeAt(user),
        };

        /// <summary>name@example.com → n•••@example.com, for the notice to the old address.</summary>
        private static string MaskEmail(string email)
        {
            var at = email.IndexOf('@');
            return at <= 0 ? "a new address" : $"{email[0]}•••{email[at..]}";
        }
    }
}
