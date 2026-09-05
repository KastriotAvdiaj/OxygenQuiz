using Moq;
using QuizAPI.DTOs.Invitations;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Invitations;
using Xunit;

namespace QuizAPI.Tests.Auth;

/// <summary>
/// Mint-time rules for invite codes. The load-bearing one is the escalation guard: a code that
/// grants a role is a second way to hand out that role, so if minting were only gated on
/// "Admin,SuperAdmin" like the rest of the controller, an Admin could mint themselves a SuperAdmin
/// code and redeem it — walking straight around the guard on PUT /api/Users/{id}/roles.
/// </summary>
public class InviteCodeServiceTests
{
    private readonly Mock<IInviteCodeRepository> _repository = new();
    private readonly IInviteCodeGenerator _generator = new InviteCodeGenerator();
    private readonly Mock<IRoleRepository> _roles = new();
    private readonly Mock<IAuditService> _audit = new();

    private InviteCodeService CreateSut() =>
        new(_repository.Object, _generator, _roles.Object, _audit.Object);

    public InviteCodeServiceTests()
    {
        _roles.Setup(r => r.GetByNameAsync("Admin", It.IsAny<CancellationToken>()))
              .ReturnsAsync(new Role { Id = 1, Name = "Admin" });
        _roles.Setup(r => r.GetByNameAsync("SuperAdmin", It.IsAny<CancellationToken>()))
              .ReturnsAsync(new Role { Id = 3, Name = "SuperAdmin" });
    }

    private static GenerateInviteCodesDTO Elevated(string role) => new()
    {
        Count = 1,
        Role = role,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        IntendedEmail = "person@example.com",
    };

    // --- Escalation guard -------------------------------------------------------------------

    [Fact]
    public async Task Generate_WhenAdminMintsASuperAdminCode_Throws403_AndStoresNothing()
    {
        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            CreateSut().GenerateAsync(Elevated("SuperAdmin"), callerIsSuperAdmin: false));

        Assert.Contains("SuperAdmin", ex.Message);
        _repository.Verify(r => r.AddRangeAsync(
            It.IsAny<IEnumerable<InviteCode>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Generate_WhenSuperAdminMintsASuperAdminCode_Succeeds()
    {
        List<InviteCode>? stored = null;
        _repository.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<InviteCode>>(), It.IsAny<CancellationToken>()))
                   .Callback<IEnumerable<InviteCode>, CancellationToken>((c, _) => stored = c.ToList())
                   .Returns(Task.CompletedTask);

        var result = await CreateSut().GenerateAsync(Elevated("SuperAdmin"), callerIsSuperAdmin: true);

        Assert.Single(result.Codes);
        Assert.Equal(3, stored!.Single().GrantedRoleId);
    }

    [Fact]
    public async Task Generate_WhenAdminMintsAnAdminCode_Succeeds()
    {
        List<InviteCode>? stored = null;
        _repository.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<InviteCode>>(), It.IsAny<CancellationToken>()))
                   .Callback<IEnumerable<InviteCode>, CancellationToken>((c, _) => stored = c.ToList())
                   .Returns(Task.CompletedTask);

        await CreateSut().GenerateAsync(Elevated("Admin"), callerIsSuperAdmin: false);

        Assert.Equal(1, stored!.Single().GrantedRoleId);
        Assert.Equal("person@example.com", stored.Single().IntendedEmail);
    }

    [Fact]
    public async Task Generate_WhenRoleIsUnknown_ThrowsConflict()
    {
        _roles.Setup(r => r.GetByNameAsync("Wizard", It.IsAny<CancellationToken>()))
              .ReturnsAsync((Role?)null);

        await Assert.ThrowsAsync<ConflictException>(() =>
            CreateSut().GenerateAsync(Elevated("Wizard"), callerIsSuperAdmin: true));
    }

    // --- Plain codes are unaffected ---------------------------------------------------------

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("User")]
    [InlineData("user")]
    public async Task Generate_WhenRoleIsTheDefault_MintsAPlainBatch_WithNoGrantAndNoRails(string? role)
    {
        List<InviteCode>? stored = null;
        _repository.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<InviteCode>>(), It.IsAny<CancellationToken>()))
                   .Callback<IEnumerable<InviteCode>, CancellationToken>((c, _) => stored = c.ToList())
                   .Returns(Task.CompletedTask);

        // No expiry, no email, 25 at a time — all still fine for a plain tester invite.
        var result = await CreateSut().GenerateAsync(
            new GenerateInviteCodesDTO { Count = 25, Role = role }, callerIsSuperAdmin: false);

        Assert.Equal(25, result.Codes.Count);
        Assert.All(stored!, c => Assert.Null(c.GrantedRoleId));
        // Every code in the batch is distinct, and only its hash is stored.
        Assert.Equal(25, stored.Select(c => c.CodeHash).Distinct().Count());
    }

    // --- Rails on an elevated code ----------------------------------------------------------

    [Fact]
    public async Task Generate_WhenElevatedCodeHasNoExpiry_Rejects()
    {
        var dto = Elevated("Admin");
        dto.ExpiresAt = null;

        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut().GenerateAsync(dto, callerIsSuperAdmin: true));
    }

    [Fact]
    public async Task Generate_WhenElevatedCodeHasNoIntendedEmail_Rejects()
    {
        var dto = Elevated("Admin");
        dto.IntendedEmail = null;

        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut().GenerateAsync(dto, callerIsSuperAdmin: true));
    }

    [Fact]
    public async Task Generate_WhenElevatedBatchIsMoreThanOne_Rejects()
    {
        var dto = Elevated("Admin");
        dto.Count = 5;

        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut().GenerateAsync(dto, callerIsSuperAdmin: true));
    }

    [Fact]
    public async Task Generate_WhenExpiryIsInThePast_Rejects()
    {
        var dto = new GenerateInviteCodesDTO { Count = 1, ExpiresAt = DateTime.UtcNow.AddDays(-1) };

        // Applies to plain codes too — minting something already dead is never what was meant.
        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut().GenerateAsync(dto, callerIsSuperAdmin: true));
    }

    [Fact]
    public async Task Generate_WhenBindingManyCodesToOneEmail_Rejects()
    {
        var dto = new GenerateInviteCodesDTO { Count = 5, IntendedEmail = "person@example.com" };

        // Only the first could ever be redeemed, so the request is a mistake, not a batch.
        await Assert.ThrowsAsync<AppValidationException>(() =>
            CreateSut().GenerateAsync(dto, callerIsSuperAdmin: true));
    }

    [Fact]
    public async Task Generate_NormalizesTheIntendedEmail()
    {
        List<InviteCode>? stored = null;
        _repository.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<InviteCode>>(), It.IsAny<CancellationToken>()))
                   .Callback<IEnumerable<InviteCode>, CancellationToken>((c, _) => stored = c.ToList())
                   .Returns(Task.CompletedTask);

        var dto = Elevated("Admin");
        dto.IntendedEmail = "  Person@Example.COM  ";

        await CreateSut().GenerateAsync(dto, callerIsSuperAdmin: true);

        // Redemption compares against a lowercased address inside the SQL WHERE clause, which is
        // case-sensitive on Postgres — so the stored value has to be normalized at mint time.
        Assert.Equal("person@example.com", stored!.Single().IntendedEmail);
    }

    // --- Revoke ------------------------------------------------------------------------------

    [Fact]
    public async Task Revoke_WhenCodeAlreadyConsumed_Rejects()
    {
        _repository.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(new InviteCode { Id = 1, ConsumedAt = DateTime.UtcNow });

        await Assert.ThrowsAsync<AppValidationException>(() => CreateSut().RevokeAsync(1));
    }

    [Fact]
    public async Task Revoke_WhenCodeMissing_ThrowsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(9, It.IsAny<CancellationToken>()))
                   .ReturnsAsync((InviteCode?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => CreateSut().RevokeAsync(9));
    }

    [Fact]
    public async Task Revoke_WhenAlreadyRevoked_IsIdempotent_AndWritesNothing()
    {
        var revokedAt = DateTime.UtcNow.AddMinutes(-5);
        _repository.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(new InviteCode { Id = 1, RevokedAt = revokedAt });

        await CreateSut().RevokeAsync(1);

        _repository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _audit.Verify(a => a.LogAsync(AuditActions.InviteCodeRevoked,
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<object?>(),
            It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
