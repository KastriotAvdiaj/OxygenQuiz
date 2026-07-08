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
using Microsoft.Extensions.Configuration;

namespace QuizAPI.Services.AuthenticationService;

public class AuthenticationService(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IEmailVerificationTokenRepository emailVerificationTokenRepository,
    IInviteCodeRepository inviteCodeRepository,
    IInviteCodeGenerator inviteCodeGenerator,
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

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
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
