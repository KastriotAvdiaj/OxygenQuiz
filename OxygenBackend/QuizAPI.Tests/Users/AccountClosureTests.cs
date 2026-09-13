using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Data;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Services.AccountClosure;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Email;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Users;

/// <summary>
/// Self-service account closure — ADR 0012. The behaviour worth pinning is the shape of the three
/// states: a closure is recoverable for its whole grace period, anonymisation keeps the row and
/// destroys the person in it, and neither can touch a protected account.
/// </summary>
public class AccountClosureTests
{
    private const int GraceDays = 30;

    private readonly Mock<IAuditService> _audit = new();

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    private AccountClosureService SutFor(ApplicationDbContext ctx) =>
        new(ctx,
            _audit.Object,
            Options.Create(new AccountClosureOptions { GracePeriodDays = GraceDays }),
            NullLogger<AccountClosureService>.Instance,
            new Mock<IEmailSender>().Object,
            new ConfigurationBuilder().Build());

    private static User AddUser(ApplicationDbContext ctx, string name, bool isProtected = false)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = name,
            ImmutableName = name.ToLowerInvariant(),
            Email = $"{name}@example.com",
            PasswordHash = "hash",
            ProfileImageUrl = "https://cdn.example/avatar.png",
            EmailConfirmed = true,
            IsProtected = isProtected,
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static Task<User> Reload(ApplicationDbContext ctx, Guid id) =>
        ctx.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == id);

    [Fact]
    public async Task RequestClosure_SoftDeletesAndSchedules()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "leaver");

        var anonymiseAt = await SutFor(ctx).RequestClosureAsync(user.Id);

        var after = await Reload(ctx, user.Id);
        Assert.True(after.IsDeleted);
        Assert.NotNull(after.DeletionRequestedAt);
        Assert.Null(after.AnonymisedAt);
        Assert.Equal(GraceDays, (anonymiseAt - after.DeletionRequestedAt!.Value).Days);
    }

    /// <summary>A double-tap must not quietly buy another thirty days.</summary>
    [Fact]
    public async Task RequestClosureTwice_DoesNotRestartTheClock()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "leaver");
        var sut = SutFor(ctx);

        var first = await sut.RequestClosureAsync(user.Id);
        var requestedAt = (await Reload(ctx, user.Id)).DeletionRequestedAt;

        var second = await sut.RequestClosureAsync(user.Id);

        Assert.Equal(first, second);
        Assert.Equal(requestedAt, (await Reload(ctx, user.Id)).DeletionRequestedAt);
    }

    [Fact]
    public async Task ProtectedAccount_CannotBeClosed()
    {
        using var ctx = NewContext();
        var root = AddUser(ctx, "root", isProtected: true);

        await Assert.ThrowsAsync<ForbiddenException>(() => SutFor(ctx).RequestClosureAsync(root.Id));

        Assert.False((await Reload(ctx, root.Id)).IsDeleted);
    }

    [Fact]
    public async Task CancelClosure_RestoresTheAccount()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "returner");
        var sut = SutFor(ctx);
        await sut.RequestClosureAsync(user.Id);

        Assert.True(await sut.CancelClosureAsync(user.Id));

        var after = await Reload(ctx, user.Id);
        Assert.False(after.IsDeleted);
        Assert.Null(after.DeletionRequestedAt);
    }

    /// <summary>Called on every login, so "nothing pending" is an answer, not an error.</summary>
    [Fact]
    public async Task CancelClosure_WithNothingPending_ReturnsFalse()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "ordinary");

        Assert.False(await SutFor(ctx).CancelClosureAsync(user.Id));
    }

    [Fact]
    public async Task Sweep_LeavesAccountsInsideTheGracePeriodAlone()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "recent");
        var sut = SutFor(ctx);
        await sut.RequestClosureAsync(user.Id);

        Assert.Equal(0, await sut.AnonymisePendingAsync());
        Assert.Null((await Reload(ctx, user.Id)).AnonymisedAt);
    }

    [Fact]
    public async Task Sweep_AnonymisesOnceTheGracePeriodHasElapsed()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "gone");
        var sut = SutFor(ctx);
        await sut.RequestClosureAsync(user.Id);

        // Reach in and age the request rather than waiting thirty days.
        var pending = await Reload(ctx, user.Id);
        pending.DeletionRequestedAt = DateTime.UtcNow.AddDays(-(GraceDays + 1));
        await ctx.SaveChangesAsync();

        Assert.Equal(1, await sut.AnonymisePendingAsync());

        var after = await Reload(ctx, user.Id);
        Assert.NotNull(after.AnonymisedAt);
        Assert.DoesNotContain("gone", after.Email);
        Assert.DoesNotContain("gone", after.Username);
        Assert.EndsWith("@deleted.invalid", after.Email);
        Assert.Null(after.PasswordHash);
        Assert.Equal(string.Empty, after.ProfileImageUrl);
        Assert.False(after.EmailConfirmed);

        // The row itself survives — that is the entire point, so every foreign key still resolves.
        Assert.Equal(user.Id, after.Id);
    }

    /// <summary>
    /// The sweep must be safe to run twice: a second pass has to find nothing, or a retry after a
    /// partial failure would re-scrub an already-scrubbed row and write a second audit entry.
    /// </summary>
    [Fact]
    public async Task Sweep_IsIdempotent()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "gone");
        var sut = SutFor(ctx);
        await sut.RequestClosureAsync(user.Id);

        var pending = await Reload(ctx, user.Id);
        pending.DeletionRequestedAt = DateTime.UtcNow.AddDays(-(GraceDays + 1));
        await ctx.SaveChangesAsync();

        Assert.Equal(1, await sut.AnonymisePendingAsync());
        Assert.Equal(0, await sut.AnonymisePendingAsync());
    }

    [Fact]
    public async Task Sweep_DeletesAuthMaterialButKeepsTheRow()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx, "gone");
        ctx.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = "hash",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
        });
        ctx.UserSettings.Add(new UserSettings { UserId = user.Id });
        await ctx.SaveChangesAsync();

        var sut = SutFor(ctx);
        await sut.RequestClosureAsync(user.Id);

        var pending = await Reload(ctx, user.Id);
        pending.DeletionRequestedAt = DateTime.UtcNow.AddDays(-(GraceDays + 1));
        await ctx.SaveChangesAsync();

        await sut.AnonymisePendingAsync();

        Assert.False(await ctx.RefreshTokens.AnyAsync(t => t.UserId == user.Id));
        Assert.False(await ctx.UserSettings.AnyAsync(s => s.UserId == user.Id));
        Assert.True(await ctx.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == user.Id));
    }

    /// <summary>
    /// A protected account should never be closable, so it should never be sweepable either. This
    /// guards the belt as well as the braces: if RequestClosureAsync's check were ever bypassed,
    /// the sweep still refuses to scrub root or the guest placeholder.
    /// </summary>
    [Fact]
    public async Task Sweep_SkipsProtectedAccounts()
    {
        using var ctx = NewContext();
        var root = AddUser(ctx, "root", isProtected: true);
        root.DeletionRequestedAt = DateTime.UtcNow.AddDays(-(GraceDays + 1));
        root.IsDeleted = true;
        await ctx.SaveChangesAsync();

        Assert.Equal(0, await SutFor(ctx).AnonymisePendingAsync());
        Assert.Null((await Reload(ctx, root.Id)).AnonymisedAt);
    }
}
