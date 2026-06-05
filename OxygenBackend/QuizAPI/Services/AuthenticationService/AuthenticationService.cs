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
    ITokenService tokenService) : IAuthenticationService
{
    private const string DefaultRoleName = "User";

    private readonly IUserRepository _userRepository = userRepository;
    private readonly IRoleRepository _roleRepository = roleRepository;
    private readonly ITokenService _tokenService = tokenService;

    public async Task<AuthResponseDTO> SignupAsync(SignupDTO dto, CancellationToken ct = default)
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
        var token = _tokenService.GenerateToken(user, roleNames);

        return new AuthResponseDTO { Token = token, User = user.ToDto(roleNames) };
    }

    public async Task<AuthResponseDTO> LoginAsync(LoginDTO dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email, tracked: true, ct);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid credentials.");

        user.LastLogin = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(ct);

        var roleNames = user.UserRoles
            .Select(ur => ur.Role.Name!)
            .ToArray();

        var token = _tokenService.GenerateToken(user, roleNames);

        return new AuthResponseDTO { Token = token, User = user.ToDto(roleNames) };
    }
}