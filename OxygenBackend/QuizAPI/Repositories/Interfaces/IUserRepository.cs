using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default);

        /// <summary>No-tracking queryable with roles included, for composable filtering
        /// (see the shared filtering framework / UserService.SearchUsersAsync).</summary>
        IQueryable<User> Query();
        Task<User?> GetByIdAsync(Guid id, bool tracked = false, CancellationToken ct = default);
        Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default);
        Task<User?> GetByEmailAsync(string email, bool tracked = false, CancellationToken ct = default);

        /// <summary>
        /// As <see cref="GetByEmailAsync"/> but past the soft-delete filter. Only LoginAsync should
        /// use this, and only so a closing account can be recovered by signing in — see the note on
        /// the implementation.
        /// </summary>
        Task<User?> GetByEmailIncludingDeletedAsync(
            string email, bool tracked = false, CancellationToken ct = default);
        Task<IReadOnlyList<User>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default);
        Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
        Task<bool> UsernameExistsAsync(string immutableName, CancellationToken ct = default);
        Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
        Task AddAsync(User user, CancellationToken ct = default);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}