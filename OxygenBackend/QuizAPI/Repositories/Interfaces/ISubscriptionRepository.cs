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

        /// <summary>The row a Paddle subscription id maps to, if any. Webhooks and reconciliation upsert by this.</summary>
        Task<UserSubscription?> GetByProviderSubscriptionIdAsync(string providerSubscriptionId, bool tracked = false, CancellationToken ct = default);

        /// <summary>Every row with a live Paddle subscription id, for the daily reconciliation job. Manual and Fake rows have nothing to read back.</summary>
        Task<IReadOnlyList<UserSubscription>> ListAllPaddleSubscriptionsAsync(CancellationToken ct = default);

        /// <summary>The user's most recent Paddle customer id, if they have ever checked out. Null before a first purchase.</summary>
        Task<string?> GetCustomerIdAsync(Guid userId, CancellationToken ct = default);

        Task AddAsync(UserSubscription subscription, CancellationToken ct = default);

        /// <summary>Drops a tracked entity from the change tracker without saving — used when a concurrent insert won a race and SaveChanges failed on the unique constraint, so the failed Added entry has to be cleared before retrying.</summary>
        void Detach(UserSubscription subscription);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
