using System.Collections.Concurrent;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Services.QuizSessionServices;

public class InMemoryQuizSessionManager : IQuizSessionManager
{
        // Key: SessionId, Value: MultiplayerSession
        private readonly ConcurrentDictionary<string, MultiplayerSession> _sessions = new();

        // Lobby chat is intentionally ephemeral: messages live only in the in-memory
        // RecentMessages buffer below and are never persisted. The write-only MongoDB
        // archiver (ILobbyChatArchiver) has been removed; to restore archival when the
        // persistent chat system lands, re-inject it here and call it in
        // AddChatMessageAsync. See docs/data/mongodb.md.

        // Copy shared with CheckSessionAsync so the pre-flight check and the real join can never
        // disagree about what they'd tell the player.
        private const string NotFoundMessage =
            "Room code doesn't exist. Check the code, or ask the host for a new invite.";
        private const string FullMessage = "This lobby is full.";

        /// <summary>
        /// How long an empty lobby is kept before it counts as abandoned.
        ///
        /// <para>Sized for a page refresh, not for a user changing their mind: a cold reload has to
        /// boot the SPA, authenticate, open the SignalR connection and re-join, and on a slow
        /// network or a dev build that is comfortably past the 5s the disconnect handler waits
        /// before removing the participant. Ninety seconds covers that with room to spare while
        /// still being far short of "come back after lunch".</para>
        ///
        /// <para>Deliberately not solved by widening the disconnect grace instead. That window is
        /// what keeps the roster honest — stretch it to 90s and a player who genuinely leaves sits
        /// in everyone else's lobby, marked ready, for a minute and a half.</para>
        /// </summary>
        private static readonly TimeSpan AbandonedLobbyGrace = TimeSpan.FromSeconds(90);

        /// <summary>
        /// The lookup every caller uses. A session past its empty-grace is treated as gone and
        /// removed on the way out, so nothing has to remember to check: a stale room code fails
        /// the same NotFound way it always did.
        /// </summary>
        private bool TryGetLiveSession(string sessionId, out MultiplayerSession session)
        {
            session = null!;
            if (!_sessions.TryGetValue(sessionId, out var found)) return false;

            // Read under the session's own lock, the way every mutation in this file writes it.
            // A DateTime? is two fields, so an unlocked read can in principle tear — and the half
            // of it that would be wrong is exactly the half this whole change is about.
            DateTime? emptySince;
            lock (found) { emptySince = found.EmptySinceUtc; }

            if (emptySince is { } since && DateTime.UtcNow - since >= AbandonedLobbyGrace)
            {
                _sessions.TryRemove(sessionId, out _);
                return false;
            }

            session = found;
            return true;
        }

        /// <summary>
        /// Drops every lobby that has been empty past the grace. Called when a lobby is created —
        /// a bounded, uncontended moment — so abandoned rooms cannot accumulate just because
        /// nobody ever types their code again. Lazy collection through
        /// <see cref="TryGetLiveSession"/> handles the ones that are asked for.
        /// </summary>
        private void PurgeAbandonedSessions()
        {
            var cutoff = DateTime.UtcNow - AbandonedLobbyGrace;
            foreach (var entry in _sessions)
            {
                if (entry.Value.EmptySinceUtc is { } emptySince && emptySince < cutoff)
                    _sessions.TryRemove(entry.Key, out _);
            }
        }

        public Task<Participant> AddParticipantAsync(string sessionId, string username, string connectionId, string? profileImageUrl = null)
        {
            if (!TryGetLiveSession(sessionId, out var session))
            {
                // SessionJoinException (not InvalidOperationException) so QuizHub can relay the real
                // reason to the client — see the type's docs.
                throw new SessionJoinException(JoinFailureReason.NotFound, NotFoundMessage);
            }

            lock (session)
            {
                var participant = session.Participants.FirstOrDefault(p => p.Username == username);
                if (participant == null)
                {
                    // Enforce max players
                    if (session.MaxPlayers > 0 && session.Participants.Count >= session.MaxPlayers)
                    {
                        throw new SessionJoinException(JoinFailureReason.Full, FullMessage);
                    }

                    participant = new Participant
                    {
                        Username = username,
                        ConnectionId = connectionId,
                        IsHost = false,
                        IsReady = false,
                        ProfileImageUrl = profileImageUrl
                    };
                    session.Participants.Add(participant);
                }
                else
                {
                    // Update connection ID on reconnect
                    participant.ConnectionId = connectionId;
                    // Ensure host status is consistent
                    participant.IsHost = (session.HostUsername == username);
                    // Refresh the avatar (it may have changed since the first join)
                    participant.ProfileImageUrl = profileImageUrl ?? participant.ProfileImageUrl;
                }

                // Somebody is in the room again, so it is no longer on its way out.
                session.EmptySinceUtc = null;

                return Task.FromResult(participant);
            }
        }

        /// <summary>
        /// Pre-flight lookup for a room code. Mirrors the checks in
        /// <see cref="AddParticipantAsync"/> without mutating anything, so the join dialog can
        /// refuse a bad code while the user is still in the dialog instead of navigating them to a
        /// lobby they can't enter. Not an enforcement point — the lobby can fill in the gap between
        /// this call and the join, which is why the same checks stay in AddParticipantAsync.
        /// </summary>
        public Task<SessionAvailability> CheckSessionAsync(string sessionId, string username)
        {
            if (!TryGetLiveSession(sessionId, out var session))
            {
                return Task.FromResult(new SessionAvailability
                {
                    CanJoin = false,
                    Reason = JoinFailureReason.NotFound,
                    Message = NotFoundMessage,
                });
            }

            lock (session)
            {
                // Someone already on the roster is rejoining (reconnect / reopened tab), so the
                // capacity check doesn't apply to them — AddParticipantAsync takes the same branch.
                var isRejoin = session.Participants.Any(p => p.Username == username);
                var isFull = !isRejoin
                    && session.MaxPlayers > 0
                    && session.Participants.Count >= session.MaxPlayers;

                return Task.FromResult(new SessionAvailability
                {
                    CanJoin = !isFull,
                    Reason = isFull ? JoinFailureReason.Full : null,
                    Message = isFull ? FullMessage : null,
                    InProgress = session.QuizState != QuizState.Lobby,
                    LobbyName = session.LobbyName,
                    ParticipantCount = session.Participants.Count,
                    MaxPlayers = session.MaxPlayers,
                });
            }
        }

        public Task RemoveParticipantAsync(string sessionId, string username)
        {
            if (TryGetLiveSession(sessionId, out var session))
            {
                lock (session)
                {
                    var participant = session.Participants.FirstOrDefault(p => p.Username == username);
                    if (participant != null)
                    {
                        session.Participants.Remove(participant);

                        // If host left, reassign
                        if (participant.IsHost && session.Participants.Count > 0)
                        {
                            var newHost = session.Participants.First();
                            newHost.IsHost = true;
                            session.HostUsername = newHost.Username;
                        }
                        else if (session.Participants.Count == 0)
                        {
                            // Lobby emptied. The match loop stops immediately — there is nobody
                            // left to play it — but the lobby itself is kept for
                            // AbandonedLobbyGrace rather than destroyed on the spot, because the
                            // commonest way a lobby empties is its host refreshing the page. See
                            // MultiplayerSession.EmptySinceUtc.
                            //
                            // HostUsername is deliberately left pointing at whoever just left: the
                            // branch above only reassigns it when someone is still here, so a host
                            // who comes back inside the grace is still the host.
                            session.MatchCts?.Cancel();
                            session.EmptySinceUtc = DateTime.UtcNow;
                        }
                    }
                }
            }
            return Task.CompletedTask;
        }

        public Task<List<Participant>> GetParticipantsAsync(string sessionId)
        {
            if (TryGetLiveSession(sessionId, out var session))
            {
                lock (session)
                {
                    // Return a copy to be thread-safe
                    return Task.FromResult(session.Participants.ToList());
                }
            }
            return Task.FromResult(new List<Participant>());
        }

        public Task SetPlayerReadyAsync(string sessionId, string username, bool isReady)
        {
            if (TryGetLiveSession(sessionId, out var session))
            {
                lock (session)
                {
                    var participant = session.Participants.FirstOrDefault(p => p.Username == username);
                    if (participant != null)
                    {
                        participant.IsReady = isReady;
                    }
                }
            }
            return Task.CompletedTask;
        }


        public Task<string?> GetHostUsernameAsync(string sessionId)
        {
             if (TryGetLiveSession(sessionId, out var session))
             {
                 return Task.FromResult<string?>(session.HostUsername);
             }
             return Task.FromResult<string?>(null);
        }

        public Task<bool> IsHostAsync(string sessionId, string username)
        {
            if (TryGetLiveSession(sessionId, out var session))
            {
                return Task.FromResult(session.HostUsername == username);
            }
            return Task.FromResult(false);
        }

        public Task<MultiplayerSession> CreateSessionAsync(string sessionId, string lobbyName, int maxPlayers, string hostUsername, string connectionId, string? hostProfileImageUrl = null)
        {
            // Empty lobbies now outlive their last participant (see AbandonedLobbyGrace), so
            // something has to collect the ones nobody ever comes back to. Here: creating a lobby
            // is rare, bounded and already touching this dictionary, and it means a code freed by
            // abandonment is reusable by the time anyone is generating codes again.
            PurgeAbandonedSessions();

            var session = new MultiplayerSession
            {
                SessionId = sessionId,
                LobbyName = lobbyName,
                MaxPlayers = maxPlayers,
                HostUsername = hostUsername,
                SelectedQuiz = null
            };

            if (!_sessions.TryAdd(sessionId, session))
            {
                throw new InvalidOperationException($"Session {sessionId} already exists");
            }

            // Add host as first participant
            var hostParticipant = new Participant
            {
                Username = hostUsername,
                ConnectionId = connectionId,
                IsHost = true,
                IsReady = false,
                ProfileImageUrl = hostProfileImageUrl
            };

            lock (session)
            {
                session.Participants.Add(hostParticipant);
            }

            return Task.FromResult(session);
        }

        public Task SetQuizAsync(string sessionId, SelectedQuizView quiz)
        {
            if (TryGetLiveSession(sessionId, out var session))
            {
                lock (session)
                {
                    session.SelectedQuiz = quiz;
                }
                return Task.CompletedTask;
            }
            throw new InvalidOperationException($"Session {sessionId} not found");
        }

        public Task<MultiplayerSession?> GetSessionAsync(string sessionId)
        {
        TryGetLiveSession(sessionId, out var session);
        return Task.FromResult(session);
    }

        // Keep only the most recent N messages per lobby so the buffer can't grow unbounded.
        private const int MaxRecentMessages = 50;

        public Task<LobbyChatMessage> AddChatMessageAsync(string sessionId, string username, string text, bool isSystem = false)
        {
            if (!TryGetLiveSession(sessionId, out var session))
                throw new InvalidOperationException($"Session {sessionId} not found.");

            var message = new LobbyChatMessage
            {
                Username = username,
                Text = text,
                SentUtc = DateTime.UtcNow,
                IsSystem = isSystem,
            };

            lock (session)
            {
                session.RecentMessages.Add(message);
                if (session.RecentMessages.Count > MaxRecentMessages)
                    session.RecentMessages.RemoveRange(0, session.RecentMessages.Count - MaxRecentMessages);
            }

            // No persistence: lobby chat is ephemeral and lives only in the in-memory buffer
            // above. (Previously fire-and-forget archived to MongoDB — see docs/data/mongodb.md.)

            return Task.FromResult(message);
        }

        public Task<IReadOnlyList<LobbyChatMessage>> GetMessagesSinceJoinAsync(string sessionId, string username)
        {
            IReadOnlyList<LobbyChatMessage> empty = new List<LobbyChatMessage>();

            if (!TryGetLiveSession(sessionId, out var session))
                return Task.FromResult(empty);

            lock (session)
            {
                var participant = session.Participants.FirstOrDefault(p => p.Username == username);
                // Not on the roster — nothing to catch up on. (JoinSession adds the participant
                // before asking for this, so in practice only a stale caller lands here.)
                if (participant is null)
                    return Task.FromResult(empty);

                // >= not > : a message sent in the same tick as the join belongs to the joiner's
                // session. The boundary matters for the host, whose CreateSession stamp and first
                // messages can share a timestamp.
                var visible = session.RecentMessages
                    .Where(m => m.SentUtc >= participant.FirstJoinedAt)
                    .ToList();

                return Task.FromResult<IReadOnlyList<LobbyChatMessage>>(visible);
            }
        }
}
