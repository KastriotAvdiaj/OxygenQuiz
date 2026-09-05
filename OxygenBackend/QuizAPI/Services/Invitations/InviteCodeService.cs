using QuizAPI.DTOs.Invitations;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Roles;

namespace QuizAPI.Services.Invitations
{
    /// <inheritdoc cref="IInviteCodeService"/>
    public class InviteCodeService : IInviteCodeService
    {
        private readonly IInviteCodeRepository _repository;
        private readonly IInviteCodeGenerator _generator;
        private readonly IRoleRepository _roleRepository;
        private readonly IAuditService _auditService;

        public InviteCodeService(
            IInviteCodeRepository repository,
            IInviteCodeGenerator generator,
            IRoleRepository roleRepository,
            IAuditService auditService)
        {
            _repository = repository;
            _generator = generator;
            _roleRepository = roleRepository;
            _auditService = auditService;
        }

        public async Task<GeneratedInviteCodesDTO> GenerateAsync(
            GenerateInviteCodesDTO dto, bool callerIsSuperAdmin, CancellationToken ct = default)
        {
            var intendedEmail = string.IsNullOrWhiteSpace(dto.IntendedEmail)
                ? null
                : dto.IntendedEmail.Trim().ToLowerInvariant();

            var grantedRole = await ResolveGrantedRoleAsync(dto.Role, callerIsSuperAdmin, ct);

            ValidateRails(dto, grantedRole, intendedEmail);

            var now = DateTime.UtcNow;
            var plaintext = new List<string>(dto.Count);
            var entities = new List<InviteCode>(dto.Count);

            for (var i = 0; i < dto.Count; i++)
            {
                var code = _generator.Generate();
                plaintext.Add(code);
                entities.Add(new InviteCode
                {
                    CodeHash = _generator.Hash(code),
                    Label = dto.Label,
                    CreatedAt = now,
                    ExpiresAt = dto.ExpiresAt,
                    GrantedRoleId = grantedRole?.Id,
                    IntendedEmail = intendedEmail,
                });
            }

            await _repository.AddRangeAsync(entities, ct);
            await _repository.SaveChangesAsync(ct);

            // Ids are populated by the save above. Logging them is what makes a batch traceable to
            // its rows later — the count alone told you a batch happened but not which codes it was.
            await _auditService.LogAsync(
                AuditActions.InviteCodesGenerated, entity: "InviteCode",
                newValue: new
                {
                    dto.Count,
                    dto.Label,
                    dto.ExpiresAt,
                    Role = grantedRole?.Name,
                    IntendedEmail = intendedEmail,
                    Ids = entities.Select(e => e.Id).ToList(),
                }, ct: ct);

            return new GeneratedInviteCodesDTO { Codes = plaintext };
        }

        /// <summary>
        /// Resolves the requested role name, or null for a plain invite. This is the
        /// privilege-escalation gate: without it, an Admin could mint themselves a SuperAdmin code
        /// and redeem it, walking straight around the guard on PUT /api/Users/{id}/roles.
        /// </summary>
        private async Task<Role?> ResolveGrantedRoleAsync(
            string? requested, bool callerIsSuperAdmin, CancellationToken ct)
        {
            var name = requested?.Trim();

            // Null, blank, or an explicit "User" all mean the same thing: grant nothing extra.
            if (!RoleRules.IsElevated(name)) return null;

            var role = await _roleRepository.GetByNameAsync(name!, ct)
                ?? throw new ConflictException($"Unknown role: {name}");

            if (RoleRules.SuperAdminOnlyRoles.Contains(role.Name) && !callerIsSuperAdmin)
                throw new ForbiddenException(
                    "Only a SuperAdmin can create an invite code that grants the SuperAdmin role.");

            return role;
        }

        /// <summary>
        /// The rails on a role-granting code. A plain tester invite is a low-value bearer secret —
        /// worst case a stranger gets an ordinary account. A code that grants Admin is a very
        /// different object, so it may not be minted in bulk, may not live forever, and may only be
        /// spent by the person it was issued to.
        /// </summary>
        private static void ValidateRails(
            GenerateInviteCodesDTO dto, Role? grantedRole, string? intendedEmail)
        {
            if (dto.ExpiresAt is { } expiry && expiry <= DateTime.UtcNow)
                throw new AppValidationException("The expiry date must be in the future.");

            // Binding many codes to one address is meaningless — only the first could ever be spent.
            if (intendedEmail is not null && dto.Count != 1)
                throw new AppValidationException(
                    "A code bound to an email address is minted one at a time.");

            if (grantedRole is null) return;

            if (dto.Count != 1)
                throw new AppValidationException(
                    $"An invite code granting {grantedRole.Name} is minted one at a time.");

            if (dto.ExpiresAt is null)
                throw new AppValidationException(
                    $"An invite code granting {grantedRole.Name} must have an expiry date.");

            if (intendedEmail is null)
                throw new AppValidationException(
                    $"An invite code granting {grantedRole.Name} must be issued to a specific email address.");
        }

        public async Task<IReadOnlyList<InviteCodeStatusDTO>> ListAsync(CancellationToken ct = default)
        {
            var codes = await _repository.ListAsync(ct);

            var usernames = await _repository.GetConsumerUsernamesAsync(
                codes.Where(c => c.ConsumedByUserId != null).Select(c => c.ConsumedByUserId!.Value), ct);

            return codes.Select(c => new InviteCodeStatusDTO
            {
                Id = c.Id,
                Label = c.Label,
                CreatedAt = c.CreatedAt,
                ExpiresAt = c.ExpiresAt,
                ConsumedAt = c.ConsumedAt,
                ConsumedByUserId = c.ConsumedByUserId,
                ConsumedByUsername = c.ConsumedByUserId is { } id && usernames.TryGetValue(id, out var name)
                    ? name : null,
                RevokedAt = c.RevokedAt,
                GrantedRole = c.GrantedRole?.Name,
                IntendedEmail = c.IntendedEmail,
                IsRedeemable = c.IsRedeemable,
            }).ToList();
        }

        public async Task RevokeAsync(int id, CancellationToken ct = default)
        {
            var code = await _repository.GetByIdAsync(id, ct)
                ?? throw new NotFoundException($"Invite code {id} not found.");

            if (code.ConsumedAt != null)
                throw new AppValidationException(
                    "This code has already been redeemed and cannot be revoked.");

            if (code.RevokedAt != null) return; // already revoked — idempotent

            code.RevokedAt = DateTime.UtcNow;
            await _repository.SaveChangesAsync(ct);

            await _auditService.LogAsync(
                AuditActions.InviteCodeRevoked, entity: "InviteCode", entityId: id.ToString(), ct: ct);
        }
    }
}
