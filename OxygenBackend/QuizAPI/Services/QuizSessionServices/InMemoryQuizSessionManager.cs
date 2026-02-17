using System.Collections.Concurrent;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Services.QuizSessionServices;

public class InMemoryQuizSessionManager : IQuizSessionManager
{
        // Key: SessionId, Value: MultiplayerSession
        private readonly ConcurrentDictionary<string, MultiplayerSession> _sessions = new();

        public Task<Participant> AddParticipantAsync(string sessionId, string username, string connectionId)
        {
            if (!_sessions.TryGetValue(sessionId, out var session))
            {
                throw new InvalidOperationException($"Session {sessionId} not found. The lobby may not exist.");
            }

            lock (session)
            {
                var participant = session.Participants.FirstOrDefault(p => p.Username == username);
                if (participant == null)
                {
                    // Enforce max players
                    if (session.MaxPlayers > 0 && session.Participants.Count >= session.MaxPlayers)
                    {
                        throw new InvalidOperationException("This lobby is full.");
                    }

                    participant = new Participant
                    {
                        Username = username,
                        ConnectionId = connectionId,
                        IsHost = false,
                        IsReady = false
                    };
                    session.Participants.Add(participant);
                }
                else
                {
                    // Update connection ID on reconnect
                    participant.ConnectionId = connectionId;
                    // Ensure host status is consistent
                    participant.IsHost = (session.HostUsername == username);
                }
                
                return Task.FromResult(participant);
            }
        }

        public Task RemoveParticipantAsync(string sessionId, string username)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
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
                            // Close session if empty?
                             _sessions.TryRemove(sessionId, out _);
                        }
                    }
                }
            }
            return Task.CompletedTask;
        }

        public Task<List<Participant>> GetParticipantsAsync(string sessionId)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
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
            if (_sessions.TryGetValue(sessionId, out var session))
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
             if (_sessions.TryGetValue(sessionId, out var session))
             {
                 return Task.FromResult<string?>(session.HostUsername);
             }
             return Task.FromResult<string?>(null);
        }

        public Task<bool> IsHostAsync(string sessionId, string username)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                return Task.FromResult(session.HostUsername == username);
            }
            return Task.FromResult(false);
        }

        public Task<MultiplayerSession> CreateSessionAsync(string sessionId, string lobbyName, int maxPlayers, string hostUsername, string connectionId)
        {
            var session = new MultiplayerSession
            {
                SessionId = sessionId,
                LobbyName = lobbyName,
                MaxPlayers = maxPlayers,
                HostUsername = hostUsername,
                SelectedQuizId = null
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
                IsReady = false
            };

            lock (session)
            {
                session.Participants.Add(hostParticipant);
            }

            return Task.FromResult(session);
        }

        public Task SetQuizAsync(string sessionId, string quizId)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                lock (session)
                {
                    session.SelectedQuizId = quizId;
                }
                return Task.CompletedTask;
            }
            throw new InvalidOperationException($"Session {sessionId} not found");
        }

        public Task<MultiplayerSession?> GetSessionAsync(string sessionId)
        {
        _sessions.TryGetValue(sessionId, out var session);
        return Task.FromResult(session);
    }
}
