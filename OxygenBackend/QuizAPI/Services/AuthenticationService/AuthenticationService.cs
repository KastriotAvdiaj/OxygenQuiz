using QuizAPI.DTOs.Authentication;
using QuizAPI.Exceptions;
using QuizAPI.ManyToManyTables;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Controllers.Notifications.Services;

namespace QuizAPI.Services.AuthenticationService;

public class AuthenticationService(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IRefreshTokenRepository refreshTokenRepository,
    ITokenService tokenService,
    IAuditService auditService,
    INotificationService notificationService) : IAuthenticationService
{
    private const string DefaultRoleName = "User";

    private readonly IUserRepository _userRepository = userRepository;
    private readonly IRoleRepository _roleRepository = roleRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository = refreshTokenRepository;
    private readonly ITokenService _tokenService = tokenService;
    private readonly IAuditService _auditService = auditService;
    private readonly INotificationService _notificationService = notificationService;

    public async Task<AuthResult> SignupAsync(SignupDTO dto, CancellationToken ct = default)
    {
        var immutableName = dto.Username.ToLowerInvariant();

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

        await _userRepository.AddAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);

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

        // Reload with the full role/permission graph: the in-memory entity above
        // only carries RoleIds, so user.ToDto() (which walks Role + RolePermissions)
        // would otherwise NPE / return no permissions.
        var created = await _userRepository.GetByIdAsync(user.Id, tracked: false, ct)
            ?? throw new InvalidOperationException("User not found immediately after creation.");

        var roleNames = created.UserRoles.Select(ur => ur.Role.Name!).ToArray();
        return await BuildAuthResultAsync(created, roleNames, ct);
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
}
