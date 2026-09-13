using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories;
using QuizAPI.Services.AccountClosure;
using QuizAPI.Services.Audit;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Users;

/// <summary>
/// Who owns an address, as signup sees it. `EmailExistsAsync` is the whole of signup's answer, so
/// these four rows are the policy: **live and closing accounts hold their address; admin-deleted and
/// anonymised ones do not.**
///
/// <para>Real repository and real closure service over an in-memory database, because the claim is
/// about a query and the column states a different class writes. A mock would let the query and the
/// states drift apart silently, which is the exact failure: the check passed through the global
/// <c>!IsDeleted</c> filter, so an account that had just closed read as "address free" and the
/// person who closed it could re-register the email they needed in order to sign back in.</para>
/// </summary>
public class EmailReservationTests
{
    private const string Address = "leaver@example.com";

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options,
            new TestCurrentUserService());

    private static AccountClosureService Closure(ApplicationDbContext ctx, int graceDays = 30) =>
        new(ctx,
            new Mock<IAuditService>().Object,
            Options.Create(new AccountClosureOptions { GracePeriodDays = graceDays }),
            NullLogger<AccountClosureService>.Instance);

    private static User AddUser(ApplicationDbContext ctx)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "player",
            ImmutableName = "player",
            Email = Address,
            PasswordHash = "hash",
            ProfileImageUrl = string.Empty,
            EmailConfirmed = true,
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    [Fact]
    public async Task AnActiveAccountHoldsItsAddress()
    {
        using var ctx = NewContext();
        AddUser(ctx);

        Assert.True(await new UserRepository(ctx).EmailExistsAsync(Address));
    }

    /// <summary>
    /// The fix. Without it the address reads as free the moment the account closes, and taking it
    /// costs the owner their recovery: sign-in looks a closing account up BY EMAIL, and a second row
    /// now answers to it.
    /// </summary>
    [Fact]
    public async Task AClosingAccountStillHoldsItsAddress()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx);
        await Closure(ctx).RequestClosureAsync(user.Id);

        Assert.True(await new UserRepository(ctx).EmailExistsAsync(Address));
    }

    /// <summary>
    /// Deliberately the other way, and the reason this isn't simply "any soft-deleted row counts":
    /// nothing ever anonymises an admin-deleted account, so counting it would make the address
    /// unusable forever. Re-registering it grants nothing — the new account is a new row.
    /// </summary>
    [Fact]
    public async Task AnAdminDeletedAccountReleasesItsAddress()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx);

        // What UserService.DeleteUserAsync does: IsDeleted, and no DeletionRequestedAt.
        user.IsDeleted = true;
        await ctx.SaveChangesAsync();

        Assert.False(await new UserRepository(ctx).EmailExistsAsync(Address));
    }

    /// <summary>
    /// The hold is bounded without a release step: the scrub rewrites the address, so the original
    /// stops matching anything the moment the grace period is served.
    /// </summary>
    [Fact]
    public async Task AnAnonymisedAccountReleasesItsAddress()
    {
        using var ctx = NewContext();
        var user = AddUser(ctx);
        var closure = Closure(ctx, graceDays: 0);

        await closure.RequestClosureAsync(user.Id);
        Assert.Equal(1, await closure.AnonymisePendingAsync());

        Assert.False(await new UserRepository(ctx).EmailExistsAsync(Address));
        Assert.Equal($"deleted-{user.Id:N}@deleted.invalid",
            (await ctx.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == user.Id)).Email);
    }
}
