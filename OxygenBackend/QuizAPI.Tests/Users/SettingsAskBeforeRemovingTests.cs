using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Settings;
using QuizAPI.Services.SettingsService;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Users;

/// <summary>
/// The quiz builder's "Don't ask again" (AskBeforeRemovingQuestion). PUT /api/settings is a full
/// replace, so the field is nullable: a client built before it existed sends nothing, and that
/// must leave the user's choice alone rather than reset it.
/// </summary>
public class SettingsAskBeforeRemovingTests
{
    private static readonly Guid User = Guid.NewGuid();

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
            new TestCurrentUserService());

    private static UpdateSettingsDTO Update(bool? ask) => new()
    {
        MusicEnabled = true, MusicVolume = 50, SoundEffectsEnabled = true, SoundEffectsVolume = 50,
        Theme = "system", ShowTimer = true, AppFont = "Baloo 2", QuizFont = "DynaPuff",
        AskBeforeRemovingQuestion = ask,
    };

    [Fact]
    public async Task On_ByDefault_Off_WhenTurnedOff_AndAnOlderClientLeavesItAlone()
    {
        await using var ctx = NewContext();
        var service = new SettingsService(ctx);

        Assert.True((await service.GetForUserAsync(User)).AskBeforeRemovingQuestion);

        await service.UpdateForUserAsync(User, Update(false));
        Assert.False((await service.GetForUserAsync(User)).AskBeforeRemovingQuestion);

        await service.UpdateForUserAsync(User, Update(null));   // a client that doesn't know the field
        Assert.False((await service.GetForUserAsync(User)).AskBeforeRemovingQuestion);

        await service.UpdateForUserAsync(User, Update(true));
        Assert.True((await service.GetForUserAsync(User)).AskBeforeRemovingQuestion);
    }
}
