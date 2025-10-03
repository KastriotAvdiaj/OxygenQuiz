using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.Services.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<FullUserDTO>> GetAllUsersAsync();
        Task<User?> GetUserByIdAsync(Guid userId);
        Task<User?> GetUserByUsernameAsync(string username);
        Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<Guid> userIds);
        Task<User> CreateUserAsync(TemporaryUserCR userCreateModel);
        Task<bool> UpdateUserAsync(Guid userId, User user);
        Task<bool> DeleteUserAsync(Guid userId);
        Task<bool> UserExistsAsync(Guid userId);
    }
}