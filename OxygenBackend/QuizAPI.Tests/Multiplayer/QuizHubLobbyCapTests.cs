using Microsoft.AspNetCore.SignalR;
using QuizAPI.Hubs;
using Xunit;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// The lobby size is clamped by the hub, not only by the create dialog
/// (docs/quiz/multiplayer.md §4.1). The join check reads 0 as "no cap", so an unclamped 0 was an
/// unlimited lobby.
/// </summary>
public class QuizHubLobbyCapTests
{
    private const string Room = "CAP123";

    [Theory]
    [InlineData(0, QuizHub.MinLobbyPlayers)]
    [InlineData(-5, QuizHub.MinLobbyPlayers)]
    [InlineData(1, QuizHub.MinLobbyPlayers)]
    [InlineData(6, 6)]
    [InlineData(5000, QuizAPI.Services.Billing.PlanCatalog.FreeLobbyPlayers)]
    public async Task The_requested_size_is_clamped_to_what_the_dialog_offers(int requested, int expected)
    {
        var h = new HubHarness();

        await h.As("ana", "ana-1").CreateSession(Room, "Ana's lobby", requested);

        var session = await h.Sessions.GetSessionAsync(Room);
        Assert.NotNull(session);
        Assert.Equal(expected, session!.MaxPlayers);
    }

    [Fact]
    public async Task A_lobby_created_with_zero_still_refuses_the_third_player()
    {
        var h = new HubHarness();
        await h.As("ana", "ana-1").CreateSession(Room, "Ana's lobby", 0);
        await h.As("ana", "ana-1").JoinSession(Room);
        await h.As("ben", "ben-1").JoinSession(Room);

        await Assert.ThrowsAsync<HubException>(() => h.As("cleo", "cleo-1").JoinSession(Room));

        var session = await h.Sessions.GetSessionAsync(Room);
        Assert.Equal(2, session!.Participants.Count);
    }

    /// <summary>The cap is the host's plan's (docs/auth/paid-plans.md), read on every create.</summary>
    [Theory]
    [InlineData(QuizAPI.Models.Billing.PlanTier.Free, 5000, 10)]
    [InlineData(QuizAPI.Models.Billing.PlanTier.Plus, 5000, 20)]
    [InlineData(QuizAPI.Models.Billing.PlanTier.Teacher, 5000, 40)]
    [InlineData(QuizAPI.Models.Billing.PlanTier.Teacher, 0, QuizHub.MinLobbyPlayers)]
    public async Task The_largest_lobby_is_the_hosts_plans(QuizAPI.Models.Billing.PlanTier plan, int requested, int expected)
    {
        var h = new HubHarness();
        h.Entitlements.Value = QuizAPI.Services.Billing.PlanCatalog.For(plan, 2);

        await h.As("ana", "ana-1").CreateSession(Room, "Ana's lobby", requested);

        var session = await h.Sessions.GetSessionAsync(Room);
        Assert.Equal(expected, session!.MaxPlayers);
    }
}
