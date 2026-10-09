using QuizAPI.Models.Billing;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>A user's subscriptions, current and past (docs/auth/paid-plans.md).</summary>
    public interface ISubscriptionRepository
    {
        /// <summary>Every subscription the user has held, newest first. Untracked.</summary>
        Task<IReadOnlyList<UserSubscription>> ListForUserAsync(Guid userId, CancellationToken ct = default);

        /// <summary>The user's manual grant, if one was ever made — there is at most one, reused on regrant.</summary>
        Task<UserSubscription?> GetManualAsync(Guid userId, bool tracked = false, CancellationToken ct = default);

        Task AddAsync(UserSubscription subscription, CancellationToken ct = default);
        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
