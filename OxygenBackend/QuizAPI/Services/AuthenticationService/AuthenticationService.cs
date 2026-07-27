using QuizAPI.Data;
using QuizAPI.DTOs.Authentication;
using QuizAPI.Exceptions;
using QuizAPI.ManyToManyTables;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Email;
using QuizAPI.Services.Invitations;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Services.AuthenticationService.External;
using Microsoft.Extensions.Configuration;

namespace QuizAPI.Services.AuthenticationService;

public class AuthenticationService(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IEmailVerificationTokenRepository emailVerificationTokenRepository,
    IInviteCodeRepository inviteCodeRepository,
    IInviteCodeGenerator inviteCodeGenerator,
    IExternalLoginRepository externalLoginRepository,
    IEnumerable<IExternalIdentityVerifier> externalIdentityVerifiers,
    ITokenService tokenService,
    IAuditService auditService,
    INotificationService notificationService,
    IEmailSender emailSender,
    ApplicationDbContext dbContext,
    IConfiguration configuration) : IAuthenticationService
{
    private const string DefaultRoleName = "User";

    private readonly IUserRepository _userRepository = userRepository;
    private readonly IRoleRepository _roleRepository = roleRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository = refreshTokenRepository;
    private readonly IEmailVerificationTokenRepository _emailVerificationTokenRepository = emailVerificationTokenRepository;
    private readonly IInviteCodeRepository _inviteCodeRepository = inviteCodeRepository;
    private readonly IInviteCodeGenerator _inviteCodeGenerator = inviteCodeGenerator;
    private readonly IExternalLoginRepository _externalLoginRepository = externalLoginRepository;
    private readonly IEnumerable<IExternalIdentityVerifier> _externalIdentityVerifiers = externalIdentityVerifiers;
    private readonly ITokenService _tokenService = tokenService;
    private readonly IAuditService _auditService = auditService;
    private readonly INotificationService _notificationService = notificationService;
    private readonly IEmailSender _emailSender = emailSender;
    private readonly ApplicationDbContext _dbContext = dbContext;
    private readonly IConfiguration _configuration = configuration;

    public async Task<AuthResult> SignupAsync(SignupDTO dto, CancellationToken ct = default)
    {
        var immutableName = dto.Username.ToLowerInvariant();

        // Invite-code gate (only when the flag is on — see docs/auth/invite-code-system-plan.md).
        // Validate early for fast, friendly rejection before any writes; the code is only
        // *consumed* after the user row is created (below), in the same transaction, so a failed
        // signup never burns a code.
        var requireInviteCode = _configuration.GetValue<bool>("Signup:RequireInviteCode");
        string? inviteCodeHash = null;
        if (requireInviteCode)
        {
            if (string.IsNullOrWhiteSpace(dto.InviteCode))
                throw new AppValidationException("An invite code is required.");

            inviteCodeHash = _inviteCodeGenerator.Hash(dto.InviteCode);
            var redeemable = await _inviteCodeRepository.GetRedeemableByHashAsync(inviteCodeHash, ct);
            if (redeemable is null)
                throw new AppValidationException("Invalid or already-used invite code.");
        }

        if (await _userRepository.EmailExistsAsync(dto.Email, ct))
            throw new ConflictException("Email is already in use.");

        if (await _userRepository.UsernameExistsAsync(immutableName, ct))
            throw new ConflictException("Username is already taken.");

        var defaultRole = await _roleRepository.GetByNameAsync(DefaultRoleName, ct)
            ?? throw new InvalidOperationException(
                $"Default role '{DefaultRoleName}' is missing. Seed it before allowing signups.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            Username = dto.Username,
            ImmutableName = immutableName,
            EmailConfirmed = false,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            DateRegistered = DateTime.UtcNow,
            LastLogin = DateTime.UtcNow,
            IsDeleted = false,
            ProfileImageUrl = string.Empty,
            UserRoles = new List<UserRole>
            {
                new() { RoleId = defaultRole.Id, AssignedAt = DateTime.UtcNow }
            }
        };

        // Wrap user creation + invite-code consumption in one transaction. If we lose the race for
        // the code (someone else spent it between the early check and now), TryConsumeAsync reports
        // 0 rows and we roll the new user back — so the cap is never exceeded and no half-state
        // (a user with no code spent) is persisted.
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);

        await _userRepository.AddAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);

        if (requireInviteCode)
        {
            var rows = await _inviteCodeRepository.TryConsumeAsync(inviteCodeHash!, user.Id, ct);
            if (rows != 1)
            {
                await transaction.RollbackAsync(ct);
                throw new AppValidationException("Invalid or already-used invite code.");
            }
        }

        await transaction.CommitAsync(ct);

        // Everything below is a post-commit side effect: a rolled-back signup must send no email,
        // create no notification, and write no audit row.

        // Send the email-confirmation link. Soft gate: the account is usable immediately, but the
        // UI nudges the user to confirm (see docs/auth/email-verification.md).
        await IssueAndSendVerificationEmailAsync(user, ct);

        // Welcome the new user with a persistent notification (waits in their bell until
        // they next load the app) and record the signup as a critical action.
        await _notificationService.CreateAsync(
            user.Id,
            "welcome",
            "Welcome to Oxygen Quiz!",
            $"Hi {user.Username}, your account is ready. Jump in and start a quiz.",
            ct);

        await _auditService.LogAsync(
            AuditActions.UserSignedUp, entity: "User", entityId: user.Id.ToString(), userId: user.Id, ct: ct);

        if (requireInviteCode)
            await _auditService.LogAsync(
                AuditActions.InviteCodeRedeemed, entity: "InviteCode", entityId: inviteCodeHash,
                userId: user.Id, ct: ct);

        // Reload with the full role/permission graph: the in-memory entity above
        // only carries RoleIds, so user.ToDto() (which walks Role + RolePermissions)
        // would otherwise NPE / return no permissions.
        var created = await _userRepository.GetByIdAsync(user.Id, tracked: false, ct)
            ?? throw new InvalidOperationException("User not found immediately after creation.");

        var roleNames = created.UserRoles.Select(ur => ur.Role.Name!).ToArray();
        return await BuildAuthResultAsync(created, roleNames, ct);
    }

    public async Task<bool> IsInviteCodeRedeemableAsync(string? code, CancellationToken ct = default)
    {
        // Blank never matches — short-circuit before hashing.
        if (string.IsNullOrWhiteSpace(code))
            return false;

        // Same Normalize+Hash path as generation and redemption, so a code that reads as valid
        // here is looked up exactly as it will be at submit.
        var hash = _inviteCodeGenerator.Hash(code);
        var redeemable = await _inviteCodeRepository.GetRedeemableByHashAsync(hash, ct);
        return redeemable is not null;
    }

    public async Task<AuthResult> LoginAsync(LoginDTO dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email, tracked: true, ct);

        // A null/empty hash means the account was created via Google/Microsoft and has no
        // password. It must fail BEFORE BCrypt.Verify (which throws on a malformed hash), and it
        // fails with the same generic message as a wrong password — a distinct one would let
        // anyone probe which emails are external-only accounts. The login page carries a static
        // hint pointing such users at the provider buttons instead.
        if (user is null ||
            string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            await _auditService.LogAsync(
                AuditActions.LoginFailed, entity: "User", newValue: new { dto.Email }, ct: ct);
            throw new UnauthorizedException("Invalid credentials.");
        }

        user.LastLogin = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(ct);

        var roleNames = user.UserRoles
            .Select(ur => ur.Role.Name!)
            .ToArray();

        await _auditService.LogAsync(
            AuditActions.UserLoggedIn, entity: "User", entityId: user.Id.ToString(), userId: user.Id, ct: ct);

        return await BuildAuthResultAsync(user, roleNames, ct);
    }

    public async Task<ExternalLoginOutcome> ExternalLoginAsync(ExternalLoginDTO dto, CancellationToken ct = default)
    {
        var identity = await VerifyExternalTokenAsync(dto.Provider, dto.IdToken, ct);

        // 1. Known identity → plain login. Lookup is by (provider, sub) — the provider's
        //    permanent account id — never by email, which can change or be recycled.
        var existingLink = await _externalLoginRepository.GetByProviderSubjectAsync(
            identity.Provider, identity.SubjectId, ct);
        if (existingLink is not null)
        {
            // Tracked load: LastLogin is updated and saved inside BuildAuthResultAsync's save.
            var linkedUser = await _userRepository.GetByIdAsync(existingLink.UserId, tracked: true, ct)
                ?? throw new UnauthorizedException("Invalid credentials.");

            linkedUser.LastLogin = DateTime.UtcNow;
            await _auditService.LogAsync(
                AuditActions.UserLoggedIn, entity: "User", entityId: linkedUser.Id.ToString(),
                newValue: new { identity.Provider }, userId: linkedUser.Id, ct: ct);

            var linkedRoles = linkedUser.UserRoles.Select(ur => ur.Role.Name!).ToArray();
            return ExternalLoginOutcome.LoggedIn(
                await BuildAuthResultAsync(linkedUser, linkedRoles, ct));
        }

        // 2. First contact for this identity. If its email matches an existing account, link —
        //    but only when the PROVIDER vouches for the email. An unverified claim here would be
        //    an account-takeover vector: anyone can type someone else's address into a profile.
        if (identity.Email is not null)
        {
            var emailOwner = await _userRepository.GetByEmailAsync(identity.Email, tracked: true, ct);
            if (emailOwner is not null)
            {
                if (!identity.EmailVerified)
                    throw new ConflictException(
                        "An account with this email already exists. Log in with your password to use it.");

                await _externalLoginRepository.AddAsync(new ExternalLogin
                {
                    UserId = emailOwner.Id,
                    Provider = identity.Provider,
                    ProviderSubjectId = identity.SubjectId,
                    Email = identity.Email,
                    CreatedAt = DateTime.UtcNow,
                }, ct);

                emailOwner.LastLogin = DateTime.UtcNow;
                await _auditService.LogAsync(
                    AuditActions.ExternalAccountLinked, entity: "User",
                    entityId: emailOwner.Id.ToString(), newValue: new { identity.Provider },
                    userId: emailOwner.Id, ct: ct);
                await _auditService.LogAsync(
                    AuditActions.UserLoggedIn, entity: "User", entityId: emailOwner.Id.ToString(),
                    newValue: new { identity.Provider }, userId: emailOwner.Id, ct: ct);

                var ownerRoles = emailOwner.UserRoles.Select(ur => ur.Role.Name!).ToArray();
                // The new link row and LastLogin are saved by BuildAuthResultAsync (shared context).
                return ExternalLoginOutcome.LoggedIn(
                    await BuildAuthResultAsync(emailOwner, ownerRoles, ct));
            }
        }

        // 3. Nobody home → the client must complete signup (username + invite code while gated).
        //    The ticket pins the verified identity across that round-trip; no session yet.
        return ExternalLoginOutcome.NeedsSignup(new ExternalSignupRequiredDTO
        {
            SignupTicket = _tokenService.GenerateExternalSignupTicket(identity),
            Email = identity.Email,
            SuggestedUsername = SuggestUsername(identity),
        });
    }

    public async Task<AuthResult> ExternalSignupAsync(ExternalSignupDTO dto, CancellationToken ct = default)
    {
        var identity = _tokenService.ValidateExternalSignupTicket(dto.SignupTicket)
            ?? throw new UnauthorizedException("Your signup session has expired. Please try again.");

        var immutableName = dto.Username.ToLowerInvariant();

        // Invite-code gate — identical contract to password signup (validate early, consume
        // atomically inside the transaction below).
        var requireInviteCode = _configuration.GetValue<bool>("Signup:RequireInviteCode");
        string? inviteCodeHash = null;
        if (requireInviteCode)
        {
            if (string.IsNullOrWhiteSpace(dto.InviteCode))
                throw new AppValidationException("An invite code is required.");

            inviteCodeHash = _inviteCodeGenerator.Hash(dto.InviteCode);
            var redeemable = await _inviteCodeRepository.GetRedeemableByHashAsync(inviteCodeHash, ct);
            if (redeemable is null)
                throw new AppValidationException("Invalid or already-used invite code.");
        }

        // Races since the ticket was minted (10-minute window): the identity may have been
        // linked by a double submit, or the email/username claimed by someone else.
        if (await _externalLoginRepository.GetByProviderSubjectAsync(
                identity.Provider, identity.SubjectId, ct) is not null)
            throw new ConflictException(
                "This external account is already connected to a user. Try signing in instead.");

        if (identity.Email is null)
            throw new AppValidationException(
                "Your provider account did not share an email address. Please sign up with the form instead.");

        if (await _userRepository.EmailExistsAsync(identity.Email, ct))
            throw new ConflictException("Email is already in use.");

        if (await _userRepository.UsernameExistsAsync(immutableName, ct))
            throw new ConflictException("Username is already taken.");

        var defaultRole = await _roleRepository.GetByNameAsync(DefaultRoleName, ct)
            ?? throw new InvalidOperationException(
                $"Default role '{DefaultRoleName}' is missing. Seed it before allowing signups.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = identity.Email,
            Username = dto.Username,
            ImmutableName = immutableName,
            // Provider-verified email → nothing left to confirm; the verification flow is skipped
            // entirely (one of the UX wins of external signup).
            EmailConfirmed = identity.EmailVerified,
            PasswordHash = null, // external-only account; LoginAsync guards against this
            DateRegistered = DateTime.UtcNow,
            LastLogin = DateTime.UtcNow,
            IsDeleted = false,
            ProfileImageUrl = string.Empty,
            UserRoles = new List<UserRole>
            {
                new() { RoleId = defaultRole.Id, AssignedAt = DateTime.UtcNow }
            }
        };

        // Same transactional shape as SignupAsync: user + identity link + consumed invite code
        // commit together or not at all. Losing the invite race rolls everything back.
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);

        await _userRepository.AddAsync(user, ct);
        await _externalLoginRepository.AddAsync(new ExternalLogin
        {
            UserId = user.Id,
            Provider = identity.Provider,
            ProviderSubjectId = identity.SubjectId,
            Email = identity.Email,
            CreatedAt = DateTime.UtcNow,
        }, ct);
        await _userRepository.SaveChangesAsync(ct);

        if (requireInviteCode)
        {
            var rows = await _inviteCodeRepository.TryConsumeAsync(inviteCodeHash!, user.Id, ct);
            if (rows != 1)
            {
                await transaction.RollbackAsync(ct);
                throw new AppValidationException("Invalid or already-used invite code.");
            }
        }

        await transaction.CommitAsync(ct);

        // Post-commit side effects only — a rolled-back signup must leave no trace.
        if (!identity.EmailVerified)
            await IssueAndSendVerificationEmailAsync(user, ct);

        await _notificationService.CreateAsync(
            user.Id,
            "welcome",
            "Welcome to Oxygen Quiz!",
            $"Hi {user.Username}, your account is ready. Jump in and start a quiz.",
            ct);

        await _auditService.LogAsync(
            AuditActions.UserSignedUp, entity: "User", entityId: user.Id.ToString(),
            newValue: new { identity.Provider }, userId: user.Id, ct: ct);
        await _auditService.LogAsync(
            AuditActions.ExternalAccountLinked, entity: "User", entityId: user.Id.ToString(),
            newValue: new { identity.Provider }, userId: user.Id, ct: ct);

        if (requireInviteCode)
            await _auditService.LogAsync(
                AuditActions.InviteCodeRedeemed, entity: "InviteCode", entityId: inviteCodeHash,
                userId: user.Id, ct: ct);

        // Reload with the full role/permission graph — same rationale as SignupAsync.
        var created = await _userRepository.GetByIdAsync(user.Id, tracked: false, ct)
            ?? throw new InvalidOperationException("User not found immediately after creation.");

        var roleNames = created.UserRoles.Select(ur => ur.Role.Name!).ToArray();
        return await BuildAuthResultAsync(created, roleNames, ct);
    }

    /// <summary>
    /// Resolves the verifier for a provider (must exist AND be enabled in config) and validates
    /// the ID token. A failed validation is audited like a failed password login.
    /// </summary>
    private async Task<ExternalIdentity> VerifyExternalTokenAsync(
        string provider, string idToken, CancellationToken ct)
    {
        var normalized = provider.Trim().ToLowerInvariant();

        var enabled = _configuration.GetValue<bool>($"Authentication:{Capitalize(normalized)}:Enabled");
        var verifier = _externalIdentityVerifiers.FirstOrDefault(v => v.Provider == normalized);
        if (verifier is null || !enabled)
            throw new AppValidationException("Unknown or disabled sign-in provider.");

        try
        {
            return await verifier.VerifyAsync(idToken, ct);
        }
        catch (UnauthorizedException)
        {
            await _auditService.LogAsync(
                AuditActions.LoginFailed, entity: "User", newValue: new { Provider = normalized }, ct: ct);
            throw;
        }
    }

    /// <summary>
    /// A friendly prefill for the username field, derived from the provider profile. Purely
    /// advisory: the form live-checks availability and the server enforces uniqueness on submit.
    /// </summary>
    private static string? SuggestUsername(ExternalIdentity identity)
    {
        var source = !string.IsNullOrWhiteSpace(identity.DisplayName)
            ? identity.DisplayName
            : identity.Email?.Split('@')[0];
        if (source is null) return null;

        var cleaned = new string(source.Where(char.IsLetterOrDigit).ToArray());
        if (cleaned.Length < 3) return null;
        return cleaned.Length > 50 ? cleaned[..50] : cleaned;
    }

    private static string Capitalize(string value) =>
        value.Length == 0 ? value : char.ToUpperInvariant(value[0]) + value[1..];

    public async Task<AuthResult> RefreshAsync(string rawRefreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
            throw new UnauthorizedException("Missing refresh token.");

        var hash = _tokenService.HashRefreshToken(rawRefreshToken);
        var stored = await _refreshTokenRepository.GetActiveByHashAsync(hash, ct)
            ?? throw new UnauthorizedException("Invalid or expired refresh token.");

        // Rotate: revoke the presented token before issuing a new one.
        stored.RevokedAt = DateTime.UtcNow;

        var user = await _userRepository.GetByIdAsync(stored.UserId, tracked: false, ct)
            ?? throw new UnauthorizedException("Invalid or expired refresh token.");

        var roleNames = user.UserRoles
            .Select(ur => ur.Role.Name!)
            .ToArray();

        return await BuildAuthResultAsync(user, roleNames, ct);
    }

    public async Task LogoutAsync(string? rawRefreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
            return;

        var hash = _tokenService.HashRefreshToken(rawRefreshToken);
        var stored = await _refreshTokenRepository.GetActiveByHashAsync(hash, ct);
        if (stored is not null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _refreshTokenRepository.SaveChangesAsync(ct);
        }
    }

    /// <summary>
    /// Mints an access token, persists a fresh refresh token, and packages both with the user DTO.
    /// Any pending tracked changes (e.g. a rotated token's RevokedAt) are saved here in one round-trip.
    /// </summary>
    private async Task<AuthResult> BuildAuthResultAsync(User user, string[] roleNames, CancellationToken ct)
    {
        var accessToken = _tokenService.GenerateToken(user, roleNames);
        var (rawRefresh, refreshHash, refreshExpiry) = _tokenService.GenerateRefreshToken();

        await _refreshTokenRepository.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = refreshExpiry,
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _refreshTokenRepository.SaveChangesAsync(ct);

        return new AuthResult
        {
            Response = new AuthResponseDTO { Token = accessToken, User = user.ToDto() },
            RawRefreshToken = rawRefresh,
            RefreshTokenExpiresAt = refreshExpiry
        };
    }

    public async Task VerifyEmailAsync(string rawToken, CancellationToken ct = default)
    {
        // 400 (not 401) on failure: this is an anonymous endpoint, and a 401 would trip the
        // frontend's silent-refresh interceptor.
        if (string.IsNullOrWhiteSpace(rawToken))
            throw new AppValidationException("Invalid or expired verification link.");

        var hash = _tokenService.HashToken(rawToken);
        var stored = await _emailVerificationTokenRepository.GetActiveByHashAsync(hash, ct)
            ?? throw new AppValidationException("Invalid or expired verification link.");

        stored.ConsumedAt = DateTime.UtcNow;

        var user = await _userRepository.GetByIdAsync(stored.UserId, tracked: true, ct)
            ?? throw new AppValidationException("Invalid or expired verification link.");

        user.EmailConfirmed = true;

        // The consumed token and the user flag are tracked on the same DbContext, so one save
        // persists both.
        await _userRepository.SaveChangesAsync(ct);

        await _auditService.LogAsync(
            AuditActions.UserEmailConfirmed, entity: "User", entityId: user.Id.ToString(),
            userId: user.Id, ct: ct);
    }

    public async Task ResendVerificationAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, tracked: false, ct);
        if (user is null || user.EmailConfirmed)
            return; // already confirmed (or unknown) — nothing to do, and don't leak which

        await IssueAndSendVerificationEmailAsync(user, ct);
    }

    // Supersedes any outstanding token for the user, issues a fresh single-use token (hash stored,
    // raw value emailed), and sends the confirmation link. Shared by signup and resend.
    private async Task IssueAndSendVerificationEmailAsync(User user, CancellationToken ct)
    {
        await _emailVerificationTokenRepository.InvalidateActiveForUserAsync(user.Id, ct);

        var (raw, hash, expiresAt) = _tokenService.GenerateEmailVerificationToken();
        await _emailVerificationTokenRepository.AddAsync(new EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        }, ct);
        await _emailVerificationTokenRepository.SaveChangesAsync(ct);

        var link = $"{FrontendBaseUrl()}/confirm-email?token={Uri.EscapeDataString(raw)}";
        var html =
            $"<p>Hi {user.Username},</p>" +
            "<p>Confirm your email to finish setting up your Oxygen Quiz account:</p>" +
            $"<p><a href=\"{link}\">Confirm my email</a></p>" +
            "<p>This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>";

        await _emailSender.SendAsync(user.Email, "Confirm your Oxygen Quiz email", html, ct);
    }

    // The confirmation link points at the frontend. Prefer an explicit App:FrontendBaseUrl,
    // else the first configured CORS origin, else the local dev default.
    private string FrontendBaseUrl() =>
        _configuration["App:FrontendBaseUrl"]
        ?? _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault()
        ?? "https://localhost:5173";
}
