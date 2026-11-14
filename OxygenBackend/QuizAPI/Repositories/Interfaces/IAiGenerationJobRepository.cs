using QuizAPI.Models.Ai;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IAiGenerationJobRepository
    {
        Task AddAsync(AiGenerationJob job, CancellationToken ct = default);

        /// <summary>The caller's own job, or null — another user's id is "not found", never "forbidden".</summary>
        Task<AiGenerationJob?> GetForUserAsync(Guid id, Guid userId, bool tracked = false, CancellationToken ct = default);

        Task<AiGenerationJob?> GetTrackedAsync(Guid id, CancellationToken ct = default);

        /// <summary>
        /// The user's newest job that is still theirs to collect — unfinished, or finished and not
        /// yet seen — created since <paramref name="sinceUtc"/>.
        /// </summary>
        Task<AiGenerationJob?> GetUncollectedAsync(Guid userId, DateTime sinceUtc, CancellationToken ct = default);

        /// <summary>The user's job that is queued or running, if any. One at a time.</summary>
        Task<AiGenerationJob?> GetUnfinishedAsync(Guid userId, DateTime sinceUtc, CancellationToken ct = default);

        /// <summary>Unfinished jobs older than the cutoff — their worker is gone. Tracked.</summary>
        Task<List<AiGenerationJob>> GetStaleUnfinishedAsync(DateTime cutoffUtc, CancellationToken ct = default);

        /// <summary>Deletes jobs created before the cutoff. Returns how many.</summary>
        Task<int> DeleteOlderThanAsync(DateTime cutoffUtc, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
