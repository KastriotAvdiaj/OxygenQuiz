namespace QuizAPI.Services.AccountIdentity
{
    /// <summary>
    /// Self-service changes to who an account IS — its email address and its display name.
    /// See docs/auth/account-identity-changes.md.
    /// </summary>
    public interface IAccountIdentityService
    {
        /// <summary>What the Account panel needs to render its edit controls.</summary>
        Task<AccountIdentityDTO> GetIdentityAsync(Guid userId, CancellationToken ct = default);

        /// <summary>
        /// Mails a confirmation link to <paramref name="newEmail"/>. Nothing changes until it is
        /// redeemed. Requires the current password.
        /// </summary>
        Task RequestEmailChangeAsync(
            Guid userId, string newEmail, string currentPassword, CancellationToken ct = default);

        /// <summary>Cancels a pending change — the link already sent stops working.</summary>
        Task CancelEmailChangeAsync(Guid userId, CancellationToken ct = default);

        /// <summary>Redeems the link from the new inbox and swaps the address. Anonymous.</summary>
        Task ConfirmEmailChangeAsync(string rawToken, CancellationToken ct = default);

        /// <summary>Changes the display name. The immutable name never changes.</summary>
        Task<AccountIdentityDTO> ChangeUsernameAsync(
            Guid userId, string newUsername, CancellationToken ct = default);
    }

    public sealed class AccountIdentityDTO
    {
        public string Username { get; init; } = string.Empty;

        /// <summary>
        /// False for an account created through Google/Microsoft that never set one. The email
        /// change is password-gated, so the panel tells these users to set one first.
        /// </summary>
        public bool HasPassword { get; init; }

        /// <summary>The address a confirmation link is waiting on, or null.</summary>
        public string? PendingEmail { get; init; }

        /// <summary>When the display name may next be changed; null means now.</summary>
        public DateTime? NextUsernameChangeAt { get; init; }
    }
}
