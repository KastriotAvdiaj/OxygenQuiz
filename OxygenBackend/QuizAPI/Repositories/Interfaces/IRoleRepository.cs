using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IRoleRepository
    {
        Task<IReadOnlyList<Role>> GetByNamesAsync(IEnumerable<string> names, CancellationToken ct = default);

        Task<Role?> GetByNameAsync(string name, CancellationToken ct = default);
    }
}