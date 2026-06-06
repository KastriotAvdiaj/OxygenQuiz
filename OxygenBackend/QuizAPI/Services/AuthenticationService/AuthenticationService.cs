using QuizAPI.DTOs.Authentication;
using QuizAPI.Exceptions;
using QuizAPI.ManyToManyTables;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.AuthenticationService;

public class AuthenticationService(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IRefreshTokenRepository refreshTokenRepository,
    ITokenService tokenService) : IAuthenticationService
{
    private const string DefaultRoleName = "User";

    private readonly IUserRepository _userRepository = userRepository;
    private readonly IRoleRepository _roleRepository = roleRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository = refreshTokenRepository;
    private readonly ITokenService _tokenService = tokenService;

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

        var roleNames = new[] { defaultRole.Name! };
        return await BuildAuthResultAsync(user, roleNames, ct);
    }

    public async Task<AuthResult> LoginAsync(LoginDTO dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email, tracked: true, ct);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid credentials.");

        user.LastLogin = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(ct);

        var roleNames = user.UserRoles
            .Select(ur => ur.Role.Name!)
            .ToArray();

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
            Response = new AuthResponseDTO { Token = accessToken, User = user.ToDto(roleNames) },
            RawRefreshToken = rawRefresh,
            RefreshTokenExpiresAt = refreshExpiry
        };
    }
}
