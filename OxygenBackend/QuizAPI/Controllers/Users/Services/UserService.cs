using QuizAPI.DTOs.User;
using QuizAPI.Exceptions;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Interfaces;
using QuizAPI.Mapping;
using QuizAPI.Services.Audit;

namespace QuizAPI.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly IAuditService _auditService;

        public UserService(IUserRepository userRepository, IRoleRepository roleRepository, IAuditService auditService)
        {
            _userRepository = userRepository;
            _roleRepository = roleRepository;
            _auditService = auditService;
        }

        public async Task<IReadOnlyList<UserDTO>> GetAllUsersAsync(CancellationToken ct = default)
        {
            var users = await _userRepository.GetAllAsync(ct);
            return users.ToDtoList();
        }

        public async Task<UserDTO?> GetUserByIdAsync(Guid userId, CancellationToken ct = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, ct: ct);
            return user?.ToDto();
        }

        public async Task<UserDTO?> GetUserByUsernameAsync(string username, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(username)) return null;
            var user = await _userRepository.GetByUsernameAsync(username, ct);
            return user?.ToDto();
        }

        public async Task<IReadOnlyList<UserDTO>> GetUsersByIdsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
        {
            var ids = userIds?.ToList() ?? new List<Guid>();
            if (ids.Count == 0) return Array.Empty<UserDTO>();
            var users = await _userRepository.GetByIdsAsync(ids, ct);
            return users.ToDtoList();
        }

        public async Task<UserDTO> CreateUserAsync(CreateUserDTO dto, CancellationToken ct = default)
        {
            var immutableName = dto.Username.Trim().ToLowerInvariant();

            if (await _userRepository.UsernameExistsAsync(immutableName, ct))
                throw new ConflictException($"Username '{dto.Username}' is already taken.");

            if (await _userRepository.EmailExistsAsync(dto.Email.Trim(), ct))
                throw new ConflictException($"Email '{dto.Email}' is already registered.");

            var requested = dto.Roles is { Count: > 0 } ? dto.Roles : new[] { "user" };
            var roles = await _roleRepository.GetByNamesAsync(requested, ct);

            var missing = requested.Select(r => r.ToLowerInvariant())
                .Except(roles.Select(r => r.Name.ToLowerInvariant()))
                .ToList();
            if (missing.Count > 0)
                throw new ConflictException($"Unknown role(s): {string.Join(", ", missing)}");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = dto.Username.Trim(),
                ImmutableName = immutableName,
                Email = dto.Email.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                DateRegistered = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow,
                IsDeleted = false,
                ProfileImageUrl = string.Empty,
                UserRoles = roles.Select(r => new UserRole { RoleId = r.Id }).ToList()
            };

            await _userRepository.AddAsync(user, ct);
            await _userRepository.SaveChangesAsync(ct);

            return user.ToDto(roles.Select(r => r.Name));
        }

        public async Task UpdateUserAsync(Guid userId, UpdateUserDTO dto, CancellationToken ct = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, tracked: true, ct: ct)
                ?? throw new NotFoundException($"User with ID {userId} not found.");

            // Only whitelisted fields — overposting is impossible here.
            user.Email = dto.Email.Trim();
            user.ProfileImageUrl = dto.ProfileImageUrl;
            user.ConcurrencyStamp = Guid.NewGuid();

            await _userRepository.SaveChangesAsync(ct);
        }

        public async Task DeleteUserAsync(Guid userId, CancellationToken ct = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, tracked: true, ct: ct)
                ?? throw new NotFoundException($"User with ID {userId} not found.");

            user.IsDeleted = true;
            await _userRepository.SaveChangesAsync(ct);

            await _auditService.LogAsync(
                "UserDeleted",
                entity: "User",
                entityId: userId.ToString(),
                oldValue: new { user.Username, user.Email },
                ct: ct);
        }

        public Task<bool> UserExistsAsync(Guid userId, CancellationToken ct = default) =>
            _userRepository.ExistsAsync(userId, ct);

        public async Task<bool> IsUsernameAvailableAsync(string username, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(username)) return false;
            // ImmutableName is the lower-cased uniqueness key, matching signup/create.
            var immutableName = username.Trim().ToLowerInvariant();
            return !await _userRepository.UsernameExistsAsync(immutableName, ct);
        }

        public async Task<bool> IsEmailAvailableAsync(string email, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            return !await _userRepository.EmailExistsAsync(email.Trim(), ct);
        }
    }
}