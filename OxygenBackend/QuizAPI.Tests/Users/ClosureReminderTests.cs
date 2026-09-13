using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Services.AccountClosure;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Email;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Users;

/// <summary>
/// The warning email a few days before a closed account is scrubbed (ADR 0012).
///
/// <para>Two properties carry this feature, and both are about a mail that goes out <b>once</b> to
/// someone who is not looking: it must arrive while there is still time to act, and it must not
/// arrive twice. The sweep runs hourly, so "once" is a claim about the stamp in the database, not
/// about the query — which is why the send is mocked but the row is real.</para>
/// </summary>
public class ClosureReminderTests
{
    private const int GraceDays = 30;
    private const int RemindDaysBefore = 3;

    private readonly Mock<IEmailSender> _email = new();
    private readonly Mock<IAuditService> _audit = new();

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    private AccountClosureService SutFor(
        ApplicationDbContext ctx, int remindDaysBefore = RemindDaysBefore) =>
        new(ctx,
            _audit.Object,
            Options.Create(new AccountClosureOptions
            {
                GracePeriodDays = GraceDays,
                ReminderDaysBefore = remindDaysBefore,
            }),
            NullLogger<AccountClosureService>.Instance,
            _email.Object,
            new ConfigurationBuilder().Build());

    /// <param name="closedDaysAgo">
    /// Written straight onto the row rather than by calling RequestClosureAsync and waiting 27 days.
    /// </param>
    private static User AddClosingUser(ApplicationDbContext ctx, double closedDaysAgo)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "leaver",
            ImmutableName = "leaver",
            Email = "leaver@example.com",
            PasswordHash = "hash",
            ProfileImageUrl = string.Empty,
            EmailConfirmed = true,
            IsDeleted = true,
            DeletionRequestedAt = DateTime.UtcNow.AddDays(-closedDaysAgo),
        };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return user;
    }

    private static Task<User> Reload(ApplicationDbContext ctx, Guid id) =>
        ctx.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == id);

    private void VerifySends(Times times) =>
        _email.Verify(e => e.SendAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(),
            It.IsAny<CancellationToken>()), times);

    [Fact]
    public async Task AClosureInsideTheReminderWindowIsWarnedOnce()
    {
        using var ctx = NewContext();
        var user = AddClosingUser(ctx, closedDaysAgo: 27); // 3 days left

        Assert.Equal(1, await SutFor(ctx).SendClosureRemindersAsync());

        VerifySends(Times.Once());
        Assert.NotNull((await Reload(ctx, user.Id)).ClosureReminderSentAt);
    }

    /// <summary>
    /// The stamp earning its place. The sweep runs every hour and the window is three days wide, so
    /// without it this person gets roughly 72 copies of "your account is about to be deleted".
    /// </summary>
    [Fact]
    public async Task TheNextSweepDoesNotWarnAgain()
    {
        using var ctx = NewContext();
        AddClosingUser(ctx, closedDaysAgo: 27);
        var sut = SutFor(ctx);

        await sut.SendClosureRemindersAsync();
        Assert.Equal(0, await sut.SendClosureRemindersAsync());

        VerifySends(Times.Once());
    }

    [Fact]
    public async Task AClosureStillEarlyInItsGracePeriodIsNotWarnedYet()
    {
        using var ctx = NewContext();
        var user = AddClosingUser(ctx, closedDaysAgo: 10); // 20 days left

        Assert.Equal(0, await SutFor(ctx).SendClosureRemindersAsync());

        VerifySends(Times.Never());
        Assert.Null((await Reload(ctx, user.Id)).ClosureReminderSentAt);
    }

    /// <summary>
    /// Signing in cancels the closure, and the person is no longer leaving — a warning after that
    /// would be alarming and wrong. Also covers the query: a cancelled row has no
    /// DeletionRequestedAt, so it cannot match however long ago it was closed.
    /// </summary>
    [Fact]
    public async Task ACancelledClosureIsNotWarned_AndIsWarnedAfreshIfItClosesAgain()
    {
        using var ctx = NewContext();
        var user = AddClosingUser(ctx, closedDaysAgo: 27);
        var sut = SutFor(ctx);

        await sut.SendClosureRemindersAsync();   // warned once
        await sut.CancelClosureAsync(user.Id);   // came back

        var cancelled = await Reload(ctx, user.Id);
        Assert.Null(cancelled.DeletionRequestedAt);
        Assert.Null(cancelled.ClosureReminderSentAt);
        Assert.Equal(0, await sut.SendClosureRemindersAsync());

        // Leaves again, and this time stays away: the second closure gets its own warning.
        cancelled.DeletionRequestedAt = DateTime.UtcNow.AddDays(-27);
        cancelled.IsDeleted = true;
        await ctx.SaveChangesAsync();

        Assert.Equal(1, await sut.SendClosureRemindersAsync());
        VerifySends(Times.Exactly(2));
    }

    /// <summary>
    /// Past the deadline there is nothing to warn about: either the sweep is about to scrub the row,
    /// or it already has and there is no address left to write to.
    /// </summary>
    [Fact]
    public async Task AnAnonymisedAccountIsNeverWarned()
    {
        using var ctx = NewContext();
        var user = AddClosingUser(ctx, closedDaysAgo: 31);
        user.AnonymisedAt = DateTime.UtcNow;
        await ctx.SaveChangesAsync();

        Assert.Equal(0, await SutFor(ctx).SendClosureRemindersAsync());

        VerifySends(Times.Never());
    }

    /// <summary>
    /// A reminder sent after the scrub is not a reminder, so an out-of-range setting turns the
    /// feature off rather than sending late. 0 is the documented way to do that deliberately.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(GraceDays)]
    [InlineData(GraceDays + 5)]
    public async Task AnOutOfRangeSettingSendsNothing(int remindDaysBefore)
    {
        using var ctx = NewContext();
        AddClosingUser(ctx, closedDaysAgo: 29);

        Assert.Equal(0, await SutFor(ctx, remindDaysBefore).SendClosureRemindersAsync());

        VerifySends(Times.Never());
    }

    /// <summary>
    /// A provider that rejects one address must not cost that person their warning permanently: the
    /// row stays unstamped, so the next hourly run tries again.
    /// </summary>
    [Fact]
    public async Task AFailedSendIsRetriedNextSweep()
    {
        using var ctx = NewContext();
        var user = AddClosingUser(ctx, closedDaysAgo: 27);
        var sut = SutFor(ctx);

        _email.Setup(e => e.SendAsync(
                  It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(),
                  It.IsAny<CancellationToken>()))
              .ThrowsAsync(new InvalidOperationException("provider down"));

        Assert.Equal(0, await sut.SendClosureRemindersAsync());
        Assert.Null((await Reload(ctx, user.Id)).ClosureReminderSentAt);

        _email.Reset();

        Assert.Equal(1, await sut.SendClosureRemindersAsync());
        Assert.NotNull((await Reload(ctx, user.Id)).ClosureReminderSentAt);
    }
}
