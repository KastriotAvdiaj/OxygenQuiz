using QuizAPI.DTOs.Invitations;

namespace QuizAPI.Services.Invitations
{
    /// <summary>
    /// Owns the rules around minting invite codes — role resolution, the privilege-escalation
    /// guard, and the extra rails a role-granting code carries. These are rules, not HTTP shape and
    /// not queries, which is what earns this a service of its own now that a code can grant a role
    /// (see the backend conventions in CLAUDE.md).
    /// </summary>
    public interface IInviteCodeService
    {
        /// <summary>
        /// Mints a batch and returns the plaintext ONCE. <paramref name="callerIsSuperAdmin"/> comes
        /// from the caller's validated JWT: the controller reads the claim, this service owns the
        /// rule (mirroring how role changes are split in UserService.SetUserRolesAsync).
        /// </summary>
        Task<GeneratedInviteCodesDTO> GenerateAsync(
            GenerateInviteCodesDTO dto, bool callerIsSuperAdmin, CancellationToken ct = default);

        Task<IReadOnlyList<InviteCodeStatusDTO>> ListAsync(CancellationToken ct = default);

        /// <summary>Revokes an unused code. Idempotent if already revoked.</summary>
        Task RevokeAsync(int id, CancellationToken ct = default);
    }
}
