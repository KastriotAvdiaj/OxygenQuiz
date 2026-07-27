using QuizAPI.Models;

namespace QuizAPI.Repositories.Interfaces
{
    /// <summary>
    /// Thin data access for external identity links (Google/Microsoft sign-in).
    /// Lookups go through the provider's stable subject id — never the email.
    /// See docs/auth/social-login-plan.md.
    /// </summary>
    public interface IExternalLoginRepository
    {
        /// <summary>The link for a (provider, sub) pair, or null if that identity is unknown.</summary>
        Task<ExternalLogin?> GetByProviderSubjectAsync(
            string provider, string providerSubjectId, CancellationToken ct = default);

        Task AddAsync(ExternalLogin login, CancellationToken ct = default);

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
