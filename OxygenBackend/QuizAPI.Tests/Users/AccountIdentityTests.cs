using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Moq;
using QuizAPI.Data;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories;
using QuizAPI.Services.AccountIdentity;
using QuizAPI.Services.Audit;
using QuizAPI.Services.AuthenticationService;
using QuizAPI.Services.Email;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Users;

/// <summary>
/// Changing who an account is: the one-namespace rule for names
/// (docs/adr/0017-one-namespace-for-names.md) and the confirm-link email change
/// (docs/auth/account-identity-changes.md).
///
/// <para>Real repositories over an in-memory database, like EmailReservationTests: the claims are
/// about which rows a query counts, and a mock would let the query and the rule drift apart. The
/// in-memory provider enforces no indexes, so these test the app-level checks; the partial unique
/// indexes are the backstop for races and live in the migration.</para>
/// </summary>
public class AccountIdentityTests
{
    private const string Password = "correct horse";

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    private static User AddUser(
        ApplicationDbContext ctx, string name, string? email = null, bool withPassword = true)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = name,
            ImmutableName = name.ToLowerInvariant(),
            Email = email ?? $"{name.ToLowerInvariant()}@example.com",
            PasswordHash = withPassword ? BCrypt.Net.BCrypt.HashPassword(Password, workFactor: 4) : null,
            ProfileImageUrl = string.Empty,
            EmailConfirmed = true,
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    /// <summary>Tokens are "raw-N"; the hash is the raw value reversed — enough to be distinct.</summary>
    private static Mock<ITokenService> Tokens()
    {
        var n = 0;
        var tokens = new Mock<ITokenService>();
        tokens.Setup(t => t.GenerateEmailChangeToken()).Returns(() =>
        {
            var raw = $"raw-{++n}";
            return (raw, Hash(raw), DateTime.UtcNow.AddHours(1));
        });
        tokens.Setup(t => t.HashToken(It.IsAny<string>())).Returns<string>(Hash);
        return tokens;
    }

    private static string Hash(string raw) => new(raw.Reverse().ToArray());

    private static (AccountIdentityService Service, Mock<IEmailSender> Mail) Service(ApplicationDbContext ctx)
    {
        var mail = new Mock<IEmailSender>();
        var service = new AccountIdentityService(
            new UserRepository(ctx),
            new EmailChangeTokenRepository(ctx),
            new PasswordResetTokenRepository(ctx),
            new EmailVerificationTokenRepository(ctx),
            Tokens().Object,
            mail.Object,
            new Mock<IAuditService>().Object,
            new ConfigurationBuilder().Build());
        return (service, mail);
    }

    // ── One namespace for names ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ACurrentDisplayNameIsTakenWhateverTheCase()
    {
        using var ctx = NewContext();
        AddUser(ctx, "Alice");

        Assert.True(await new UserRepository(ctx).NameTakenAsync("aLiCe", exceptUserId: null));
    }

    /// <summary>
    /// The case two separate per-column rules would miss: Carol renames away, and "Carol" is no
    /// longer anyone's display name — but it is still her immutable name, so it still resolves to
    /// her account. Nobody else may start displaying it.
    /// </summary>
    [Fact]
    public async Task AnImmutableNameStaysReservedAfterItsOwnerRenames()
    {
        using var ctx = NewContext();
        var carol = AddUser(ctx, "Carol");
        var bob = AddUser(ctx, "Bob");
        var (service, _) = Service(ctx);

        await service.ChangeUsernameAsync(carol.Id, "Dave");

        await Assert.ThrowsAsync<ConflictException>(() => service.ChangeUsernameAsync(bob.Id, "Carol"));
    }

    [Fact]
    public async Task YourOwnNamesDoNotCountAgainstYou()
    {
        using var ctx = NewContext();
        var alice = AddUser(ctx, "alice");

        Assert.False(await new UserRepository(ctx).NameTakenAsync("Alice", exceptUserId: alice.Id));
    }

    [Fact]
    public async Task SignupCannotTakeAnotherAccountsDisplayName()
    {
        using var ctx = NewContext();
        var bob = AddUser(ctx, "Bob");
        var (service, _) = Service(ctx);
        await service.ChangeUsernameAsync(bob.Id, "Zed");

        // Signup's check (UsernameExistsAsync) is the same namespace: "zed" is Bob's now.
        Assert.True(await new UserRepository(ctx).UsernameExistsAsync("zed"));
    }

    [Fact]
    public async Task AClosingAccountKeepsItsNameAndAnAdminDeletedOneDoesNot()
    {
        using var ctx = NewContext();
        var closing = AddUser(ctx, "Closing");
        closing.IsDeleted = true;
        closing.DeletionRequestedAt = DateTime.UtcNow;
        var removed = AddUser(ctx, "Removed");
        removed.IsDeleted = true; // admin deletion: no DeletionRequestedAt
        ctx.SaveChanges();

        var repo = new UserRepository(ctx);
        Assert.True(await repo.NameTakenAsync("closing", exceptUserId: null));
        Assert.False(await repo.NameTakenAsync("removed", exceptUserId: null));
    }

    // ── Renaming ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ARenameKeepsTheImmutableNameAndStartsTheCooldown()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "Kastriot");
        var (service, _) = Service(ctx);

        var identity = await service.ChangeUsernameAsync(user.Id, "Oxygen");

        var stored = ctx.Users.Single(u => u.Id == user.Id);
        Assert.Equal("Oxygen", stored.Username);
        Assert.Equal("kastriot", stored.ImmutableName);
        Assert.NotNull(identity.NextUsernameChangeAt);

        await Assert.ThrowsAsync<AppValidationException>(() => service.ChangeUsernameAsync(user.Id, "Hydrogen"));
    }

    [Fact]
    public async Task ChangingOnlyTheCaseIsFreeEvenDuringTheCooldown()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "Kastriot");
        var (service, _) = Service(ctx);
        await service.ChangeUsernameAsync(user.Id, "oxygen");

        await service.ChangeUsernameAsync(user.Id, "Oxygen");

        Assert.Equal("Oxygen", ctx.Users.Single(u => u.Id == user.Id).Username);
    }

    // ── Email change ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AskingDoesNotChangeTheAddressAndMailsTheNewOne()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "mover", "old@example.com");
        var (service, mail) = Service(ctx);

        await service.RequestEmailChangeAsync(user.Id, "new@example.com", Password);

        Assert.Equal("old@example.com", ctx.Users.Single(u => u.Id == user.Id).Email);
        Assert.Equal("new@example.com", (await service.GetIdentityAsync(user.Id)).PendingEmail);
        mail.Verify(m => m.SendAsync("new@example.com", It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AWrongPasswordIsRefused()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "mover");
        var (service, _) = Service(ctx);

        await Assert.ThrowsAsync<AppValidationException>(
            () => service.RequestEmailChangeAsync(user.Id, "new@example.com", "wrong"));
    }

    /// <summary>A session alone is not enough — a Google-only account sets a password first.</summary>
    [Fact]
    public async Task AnAccountWithNoPasswordMustSetOneFirst()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "googler", withPassword: false);
        var (service, _) = Service(ctx);

        await Assert.ThrowsAsync<AppValidationException>(
            () => service.RequestEmailChangeAsync(user.Id, "new@example.com", ""));
    }

    [Fact]
    public async Task AnAddressAnotherAccountHoldsIsRefused()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "mover");
        AddUser(ctx, "holder", "taken@example.com");
        var (service, _) = Service(ctx);

        await Assert.ThrowsAsync<ConflictException>(
            () => service.RequestEmailChangeAsync(user.Id, "taken@example.com", Password));
    }

    /// <summary>
    /// The swap, and the reason reset links die with it: a link already in the OLD inbox would
    /// otherwise still hand the account to whoever reads that inbox after the owner moved on.
    /// </summary>
    [Fact]
    public async Task ConfirmingSwapsTheAddressKillsOldResetLinksAndTellsTheOldInbox()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "mover", "old@example.com");
        user.EmailConfirmed = false;
        ctx.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = user.Id, TokenHash = "reset",
            ExpiresAt = DateTime.UtcNow.AddHours(1), CreatedAt = DateTime.UtcNow,
        });
        ctx.SaveChanges();
        var (service, mail) = Service(ctx);

        await service.RequestEmailChangeAsync(user.Id, "new@example.com", Password);
        await service.ConfirmEmailChangeAsync("raw-1");

        var stored = ctx.Users.Single(u => u.Id == user.Id);
        Assert.Equal("new@example.com", stored.Email);
        Assert.True(stored.EmailConfirmed);
        Assert.All(ctx.PasswordResetTokens, t => Assert.NotNull(t.ConsumedAt));
        Assert.Null((await service.GetIdentityAsync(user.Id)).PendingEmail);
        mail.Verify(m => m.SendAsync("old@example.com", It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ALinkWorksOnce()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "mover");
        var (service, _) = Service(ctx);
        await service.RequestEmailChangeAsync(user.Id, "new@example.com", Password);
        await service.ConfirmEmailChangeAsync("raw-1");

        await Assert.ThrowsAsync<AppValidationException>(() => service.ConfirmEmailChangeAsync("raw-1"));
    }

    [Fact]
    public async Task AskingAgainKillsTheFirstLink()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "mover");
        var (service, _) = Service(ctx);
        await service.RequestEmailChangeAsync(user.Id, "first@example.com", Password);
        await service.RequestEmailChangeAsync(user.Id, "second@example.com", Password);

        await Assert.ThrowsAsync<AppValidationException>(() => service.ConfirmEmailChangeAsync("raw-1"));
        await service.ConfirmEmailChangeAsync("raw-2");
        Assert.Equal("second@example.com", ctx.Users.Single(u => u.Id == user.Id).Email);
    }

    /// <summary>The address is re-checked at redemption — the request was up to an hour ago.</summary>
    [Fact]
    public async Task AnAddressRegisteredInTheMeantimeIsNotTaken()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "mover", "old@example.com");
        var (service, _) = Service(ctx);
        await service.RequestEmailChangeAsync(user.Id, "new@example.com", Password);
        AddUser(ctx, "quicker", "new@example.com");

        await Assert.ThrowsAsync<ConflictException>(() => service.ConfirmEmailChangeAsync("raw-1"));
        Assert.Equal("old@example.com", ctx.Users.Single(u => u.Id == user.Id).Email);
    }
}
