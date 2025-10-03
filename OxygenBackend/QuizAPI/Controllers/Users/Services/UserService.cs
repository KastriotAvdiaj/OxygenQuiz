using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.User;
using QuizAPI.Models;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;
        private readonly DashboardService _dashboardService;

        public UserService(ApplicationDbContext context, DashboardService dashboardService)
        {
            _context = context;
            _dashboardService = dashboardService;
        }

        public async Task<IEnumerable<FullUserDTO>> GetAllUsersAsync()
        {
            var totalUsers = _dashboardService.GetTotalCount<User>();
            var users = await _context.Users.Include(u => u.Role).ToListAsync();

            return users.Select(user => new FullUserDTO
            {
                Id = user.Id,
                ImmutableName = user.ImmutableName,
                Username = user.Username,
                Email = user.Email,
                DateRegistered = user.DateRegistered,
                Role = MapRoleIdToRole(user.RoleId),
                IsDeleted = user.IsDeleted,
                TotalUsers = totalUsers,
                LastLogin = user.LastLogin,
                ProfileImageUrl = user.ProfileImageUrl
            }).ToList();
        }

        public async Task<User?> GetUserByIdAsync(Guid userId)
        {
            return await _context.Users.FindAsync(userId);
        }

        public async Task<User?> GetUserByUsernameAsync(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
                return null;

            return await _context.Users
                .FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
        }

        public async Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<Guid> userIds)
        {
            if (userIds == null || !userIds.Any())
                return Enumerable.Empty<User>();

            return await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .ToListAsync();
        }

        public async Task<User> CreateUserAsync(TemporaryUserCR userCreateModel)
        {
            int roleId = !string.IsNullOrEmpty(userCreateModel.Role)
                ? MapRoleToRoleId(userCreateModel.Role)
                : 2;

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Username = userCreateModel.Username,
                Email = userCreateModel.Email,
                ImmutableName = userCreateModel.Username.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(userCreateModel.Password),
                DateRegistered = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow,
                RoleId = roleId,
                IsDeleted = false,
                ProfileImageUrl = string.Empty
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return newUser;
        }

        public async Task<bool> UpdateUserAsync(Guid userId, User user)
        {
            if (userId != user.Id)
                return false;

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await UserExistsAsync(userId))
                    return false;
                throw;
            }
        }

        public async Task<bool> DeleteUserAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return false;

            user.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UserExistsAsync(Guid userId)
        {
            return await _context.Users.AnyAsync(e => e.Id == userId);
        }

        private static string MapRoleIdToRole(int roleId)
        {
            return roleId switch
            {
                2 => "admin",
                1 => "user",
                3 => "superadmin",
                _ => "user"
            };
        }

        private static int MapRoleToRoleId(string role)
        {
            return role.ToLower() switch
            {
                "admin" => 1,
                "user" => 2,
                "superadmin" => 3,
                _ => 2 // default to user if role is unknown
            };
        }
    }
}