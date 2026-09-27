using QuizAPI.Services.QuizSessionServices;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// A lobby knows its players by account id; the name is a label pinned at first join. Before this,
/// the name WAS the identity, and the match was saved by matching it against ImmutableName — so
/// anyone whose display name had changed silently lost their results.
/// See docs/auth/account-identity-changes.md § Multiplayer.
/// </summary>
public class LobbyIdentityTests
{
    private static readonly Guid Host = Guid.NewGuid();
    private static readonly Guid Guest = Guid.NewGuid();

    [Fact]
    public async Task EveryPlayerIsRecordedByAccountId()
    {
        var manager = new InMemoryQuizSessionManager();
        var session = await manager.CreateSessionAsync("ROOM1", "Lobby", 4, Host, "HostName", "c1");
        await manager.AddParticipantAsync("ROOM1", Guest, "GuestName", "c2");

        Assert.Equal(Host, session.PlayerUserIds["HostName"]);
        Assert.Equal(Guest, session.PlayerUserIds["GuestName"]);
    }

    /// <summary>
    /// Renamed while away, back in the same lobby: same account, so the same name — the scores,
    /// the answers and HostUsername are all keyed by it.
    /// </summary>
    [Fact]
    public async Task SomeoneWhoRenamedAndCameBackKeepsTheirLobbyName()
    {
        var manager = new InMemoryQuizSessionManager();
        await manager.CreateSessionAsync("ROOM2", "Lobby", 4, Host, "HostName", "c1");
        await manager.AddParticipantAsync("ROOM2", Guest, "GuestName", "c2");
        await manager.RemoveParticipantAsync("ROOM2", "GuestName");

        var back = await manager.AddParticipantAsync("ROOM2", Guest, "RenamedGuest", "c3");

        Assert.Equal("GuestName", back.Username);
    }

    [Fact]
    public async Task AReconnectIsRecognisedByAccountNotByName()
    {
        var manager = new InMemoryQuizSessionManager();
        var session = await manager.CreateSessionAsync("ROOM3", "Lobby", 2, Host, "HostName", "c1");
        await manager.AddParticipantAsync("ROOM3", Guest, "GuestName", "c2");

        // Full lobby, but this is the same account reconnecting under a newer display name.
        var again = await manager.AddParticipantAsync("ROOM3", Guest, "RenamedGuest", "c9");

        Assert.Equal("GuestName", again.Username);
        Assert.Equal("c9", again.ConnectionId);
        Assert.Equal(2, session.Participants.Count);
    }

    [Fact]
    public async Task TheHostComingBackToALingeringLobbyIsStillHost()
    {
        var manager = new InMemoryQuizSessionManager();
        await manager.CreateSessionAsync("ROOM4", "Lobby", 4, Host, "HostName", "c1");
        await manager.RemoveParticipantAsync("ROOM4", "HostName");

        var back = await manager.AddParticipantAsync("ROOM4", Host, "NewHostName", "c2");

        Assert.True(back.IsHost);
    }
}
