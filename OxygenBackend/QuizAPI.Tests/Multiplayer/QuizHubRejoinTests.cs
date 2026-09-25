using Moq;
using QuizAPI.Services.QuizSessionServices;
using Xunit;

namespace QuizAPI.Tests.Multiplayer;

/// <summary>
/// Getting back into a lobby after SignalR's automatic reconnect (docs/quiz/multiplayer.md §3.6).
/// The client re-invokes <c>JoinSession</c> with its new connection id; these pin what the server
/// has to do with that call for the rejoin to be invisible to everyone else in the room.
/// </summary>
public class QuizHubRejoinTests
{
    private const string Room = "ABC123";

    private static async Task<HubHarness> LobbyWithAnaAndBen()
    {
        var h = new HubHarness();
        await h.As("ana", "ana-1").CreateSession(Room, "Ana's lobby", 4);
        await h.As("ana", "ana-1").JoinSession(Room);
        await h.As("ben", "ben-1").JoinSession(Room);
        h.Group.Invocations.Clear();
        h.Caller.Invocations.Clear();
        h.Groups.Invocations.Clear();
        return h;
    }

    [Fact]
    public async Task A_first_join_is_announced_to_the_room()
    {
        var h = new HubHarness();
        await h.As("ana", "ana-1").CreateSession(Room, "Ana's lobby", 4);

        await h.As("ben", "ben-1").JoinSession(Room);

        h.Group.Verify(c => c.UserJoined("ben", false, It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task A_rejoin_moves_the_participant_to_the_new_connection()
    {
        var h = await LobbyWithAnaAndBen();

        await h.As("ben", "ben-2").JoinSession(Room);

        var ben = (await h.Sessions.GetParticipantsAsync(Room)).Single(p => p.Username == "ben");
        Assert.Equal("ben-2", ben.ConnectionId);
        // So the disconnect grace, which compares against the id that dropped, leaves Ben alone.
        h.Groups.Verify(g => g.AddToGroupAsync("ben-2", Room, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_rejoin_is_not_announced_as_a_new_arrival()
    {
        var h = await LobbyWithAnaAndBen();

        await h.As("ben", "ben-2").JoinSession(Room);

        // Everyone already has Ben in their roster: a second UserJoined would toast
        // "ben joined the lobby" at the others for a network blip.
        h.Group.Verify(c => c.UserJoined(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task A_rejoin_gets_the_catch_up_bundle()
    {
        var h = await LobbyWithAnaAndBen();

        await h.As("ben", "ben-2").JoinSession(Room);

        h.Caller.Verify(c => c.CurrentParticipants(It.Is<List<Participant>>(l => l.Count == 2)), Times.Once);
        h.Caller.Verify(c => c.LobbySettingsChanged("Ana's lobby", 4), Times.Once);
        h.Caller.Verify(c => c.ChatHistory(It.IsAny<IReadOnlyList<LobbyChatMessage>>()), Times.Once);
    }

    [Fact]
    public async Task After_a_rejoin_the_connection_can_use_the_lobby_again()
    {
        var h = await LobbyWithAnaAndBen();

        // A reconnected connection has empty Context.Items until it rejoins — this is the
        // "You are not in this lobby." the reconnect used to cause.
        await Assert.ThrowsAsync<Microsoft.AspNetCore.SignalR.HubException>(
            () => h.As("ben", "ben-2").SendLobbyMessage(Room, "hi"));

        await h.As("ben", "ben-2").JoinSession(Room);
        await h.As("ben", "ben-2").SendLobbyMessage(Room, "hi");

        h.Group.Verify(c => c.ChatMessageReceived(It.Is<LobbyChatMessage>(m => m.Text == "hi")), Times.Once);
    }

    // ── The disconnect grace (multiplayer.md §3.5) ──────────────────────────
    //
    // Found by driving two browsers against the real API (2026-09-25): the grace's background task
    // made its scope from the hub's own IServiceProvider — the per-invocation scope, disposed by the
    // time the 5 seconds were up — so it threw, silently, and nobody who closed their tab was ever
    // removed. In a Duel that meant a player who left never forfeited.

    [Fact]
    public async Task A_dropped_connection_that_does_not_come_back_is_removed_after_the_grace()
    {
        var h = await LobbyWithAnaAndBen();

        await h.As("ben", "ben-1").OnDisconnectedAsync(null);
        await Task.Delay(100);   // the grace runs on a background task; let it start its timer
        h.Clock.Advance(TimeSpan.FromSeconds(4.9));
        await Task.Delay(50);
        Assert.Contains(await h.Sessions.GetParticipantsAsync(Room), p => p.Username == "ben");

        h.Clock.Advance(TimeSpan.FromSeconds(0.2));
        await DuelWorld.Eventually(() => h.Sessions.GetParticipantsAsync(Room).Result.All(p => p.Username != "ben"));
        await DuelWorld.Eventually(() => h.Group.Invocations.Any(i => i.Method.Name == "UserLeft"));
        // …and a Duel they were seated in is forfeited, as if they had clicked Leave.
        await DuelWorld.Eventually(() => h.Duels.Invocations.Any(i => i.Method.Name == "PlayerLeftAsync"));
        h.Duels.Verify(d => d.PlayerLeftAsync(Room, "ben"), Times.Once);
    }

    [Fact]
    public async Task A_connection_that_comes_back_inside_the_grace_keeps_its_place()
    {
        var h = await LobbyWithAnaAndBen();

        await h.As("ben", "ben-1").OnDisconnectedAsync(null);
        await h.As("ben", "ben-2").JoinSession(Room);   // the client's rejoin after a reconnect
        await Task.Delay(100);
        h.Clock.Advance(TimeSpan.FromSeconds(6));
        await Task.Delay(100);

        Assert.Contains(await h.Sessions.GetParticipantsAsync(Room), p => p.Username == "ben");
        h.Group.Verify(c => c.UserLeft(It.IsAny<string>()), Times.Never);
        h.Duels.Verify(d => d.PlayerLeftAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}
