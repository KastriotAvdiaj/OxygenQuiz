using Microsoft.AspNetCore.SignalR;
using QuizAPI.Hubs.Clients;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Hubs;

public class QuizHub : Hub<IQuizClient>
{
    private readonly IQuizSessionManager _sessionManager;

    public QuizHub(IQuizSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    public async Task JoinSession(string sessionId, string username)
    {
        // 1. Add to SignalR Group
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
        
        // 2. Add to Session Manager (Persist State)
        var participant = await _sessionManager.AddParticipantAsync(sessionId, username, Context.ConnectionId);

        // 3. Store in Context for OnDisconnected handling
        Context.Items["SessionId"] = sessionId;
        Context.Items["Username"] = username;

        // 4. Broadcast to others that user joined
        await Clients.Group(sessionId).UserJoined(username, participant.IsHost);

        // 5. Send CURRENT participants to the NEW user
        var currentParticipants = await _sessionManager.GetParticipantsAsync(sessionId);
        await Clients.Caller.CurrentParticipants(currentParticipants);
    }

    public async Task LeaveSession(string sessionId, string username)
    {
        var wasHost = await _sessionManager.IsHostAsync(sessionId, username);
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
        
        await _sessionManager.RemoveParticipantAsync(sessionId, username);
        
        // Clear Context items as they cleanly left
        Context.Items.Remove("SessionId");
        Context.Items.Remove("Username");

        await Clients.Group(sessionId).UserLeft(username);
        
        // If host left, notify about new host
        if (wasHost)
        {
            var newHostUsername = await _sessionManager.GetHostUsernameAsync(sessionId);
            if (newHostUsername != null)
            {
                await Clients.Group(sessionId).HostChanged(newHostUsername);
            }
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Check if we have session info stored in the context
        if (Context.Items.TryGetValue("SessionId", out var sessionIdObj) && 
            Context.Items.TryGetValue("Username", out var usernameObj))
        {
            var sessionId = sessionIdObj as string;
            var username = usernameObj as string;

            if (!string.IsNullOrEmpty(sessionId) && !string.IsNullOrEmpty(username))
            {
                var wasHost = await _sessionManager.IsHostAsync(sessionId, username);
                
                // Clean up the participant
                await _sessionManager.RemoveParticipantAsync(sessionId, username);
                await Clients.Group(sessionId).UserLeft(username);
                
                // If host disconnected, notify about new host
                if (wasHost)
                {
                    var newHostUsername = await _sessionManager.GetHostUsernameAsync(sessionId);
                    if (newHostUsername != null)
                    {
                        await Clients.Group(sessionId).HostChanged(newHostUsername);
                    }
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SubmitAnswer(string sessionId, string username, string answer)
    {
        // In a real scenario, we might process this, calculate score, etc.
        // For now, we just broadcast that an answer was submitted (maybe for progress bars)
        await Clients.Group(sessionId).AnswerSubmitted(username);
    }

    public async Task ToggleReady(string sessionId, string username, bool isReady)
    {
        await _sessionManager.SetPlayerReadyAsync(sessionId, username, isReady);
        await Clients.Group(sessionId).PlayerReadyChanged(username, isReady);
    }

    public async Task CreateSession(string sessionId, string lobbyName, int maxPlayers, string username)
    {
        try
        {
            // Create session with settings
            var session = await _sessionManager.CreateSessionAsync(sessionId, lobbyName, maxPlayers, username, Context.ConnectionId);
            
            // Add to SignalR Group
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            
            // Store in Context for disconnect handling
            Context.Items["SessionId"] = sessionId;
            Context.Items["Username"] = username;
            
            // Send session info to creator
            await Clients.Caller.CurrentParticipants(session.Participants);
        }
        catch (InvalidOperationException ex)
        {
            // Session already exists - throw error to client
            throw new HubException(ex.Message);
        }
    }

    public async Task SelectQuiz(string sessionId, string quizId, string quizTitle)
    {
        // Verify caller is host
        var username = Context.Items["Username"] as string;
        if (string.IsNullOrEmpty(username))
        {
            throw new HubException("User not authenticated");
        }
        
        var isHost = await _sessionManager.IsHostAsync(sessionId, username);
        if (!isHost)
        {
            throw new HubException("Only the host can select a quiz");
        }
        
        // Set quiz
        await _sessionManager.SetQuizAsync(sessionId, quizId);
        
        // Broadcast to all participants
        await Clients.Group(sessionId).QuizSelected(quizId, quizTitle);
    }

    public async Task StartQuiz(string sessionId, string quizId)
    {
        // Verify host? For now assume valid source.
        await Clients.Group(sessionId).GameStarted(quizId);
    }
}
