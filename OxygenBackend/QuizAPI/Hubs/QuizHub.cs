using Microsoft.AspNetCore.SignalR;
using QuizAPI.Hubs.Clients;
using QuizAPI.Services.Interfaces;
using QuizAPI.Services.QuizSessionServices;

namespace QuizAPI.Hubs;

public class QuizHub : Hub<IQuizClient>
{
    private readonly IQuizSessionManager _sessionManager;
    private readonly IServiceProvider _serviceProvider;
    private readonly IMatchOrchestrator _matchOrchestrator;

    public QuizHub(
        IQuizSessionManager sessionManager,
        IServiceProvider serviceProvider,
        IMatchOrchestrator matchOrchestrator)
    {
        _sessionManager = sessionManager;
        _serviceProvider = serviceProvider;
        _matchOrchestrator = matchOrchestrator;
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

        // 6. Send recent lobby chat so the new user has some context.
        var recentMessages = await _sessionManager.GetRecentMessagesAsync(sessionId);
        await Clients.Caller.ChatHistory(recentMessages);
    }

    // Ephemeral lobby chat. Available only while the session is in the lobby (not mid-match).
    // The sender is taken from the connection context, never trusted from the client.
    public async Task SendLobbyMessage(string sessionId, string text)
    {
        var username = Context.Items["Username"] as string;
        if (string.IsNullOrEmpty(username))
            throw new HubException("You are not in this lobby.");

        var session = await _sessionManager.GetSessionAsync(sessionId);
        if (session is null)
            throw new HubException("Lobby not found.");

        if (session.QuizState != QuizState.Lobby && session.QuizState != QuizState.Starting)
            throw new HubException("Chat is only available in the lobby.");

        text = (text ?? string.Empty).Trim();
        if (text.Length == 0)
            return;
        if (text.Length > 500)
            text = text.Substring(0, 500);

        var message = await _sessionManager.AddChatMessageAsync(sessionId, username, text);
        await Clients.Group(sessionId).ChatMessageReceived(message);
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
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(sessionId) && !string.IsNullOrEmpty(username))
            {
                // Use a background task to delay participant removal, granting a 5s grace period for page refreshes
                _ = Task.Run(async () =>
                {
                    await Task.Delay(5000); 

                    using var scope = _serviceProvider.CreateScope();
                    var sessionManager = scope.ServiceProvider.GetRequiredService<IQuizSessionManager>();
                    var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<QuizHub, IQuizClient>>();

                    var participants = await sessionManager.GetParticipantsAsync(sessionId);
                    var p = participants.FirstOrDefault(x => x.Username == username);
                    
                    // Only remove if they exist and still have the OLD connection ID (meaning they didn't reconnect)
                    if (p != null && p.ConnectionId == connectionId)
                    {
                        var wasHost = await sessionManager.IsHostAsync(sessionId, username);
                        
                        await sessionManager.RemoveParticipantAsync(sessionId, username);
                        await hubContext.Clients.Group(sessionId).UserLeft(username);
                        
                        if (wasHost)
                        {
                            var newHostUsername = await sessionManager.GetHostUsernameAsync(sessionId);
                            if (newHostUsername != null)
                            {
                                await hubContext.Clients.Group(sessionId).HostChanged(newHostUsername);
                            }
                        }
                    }
                });
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Records a player's answer for the current question. The server grades it later (when the
    // round closes) — nothing about correctness is sent back here. First submission of the round
    // wins; late or duplicate submissions are ignored.
    public async Task SubmitAnswer(string sessionId, string username, string answer)
    {
        var session = await _sessionManager.GetSessionAsync(sessionId);
        if (session is null || session.QuizState != QuizState.QuestionActive)
            return; // not accepting answers right now

        if (DateTime.UtcNow > session.QuestionDeadlineUtc)
            return; // too late

        var record = new RoundAnswer { Raw = answer, SubmittedUtc = DateTime.UtcNow };
        if (!session.CurrentRoundAnswers.TryAdd(username, record))
            return; // already answered this round

        // Let everyone see this player has locked in (progress only — no correctness leaked).
        await Clients.Group(sessionId).AnswerSubmitted(username);
    }

    // Host-only: kick off the live match. Validates host here; the orchestrator validates the
    // rest (quiz selected, enough players) and runs the question loop.
    public async Task StartMatch(string sessionId)
    {
        var username = Context.Items["Username"] as string;
        if (string.IsNullOrEmpty(username))
            throw new HubException("You are not in this lobby.");

        if (!await _sessionManager.IsHostAsync(sessionId, username))
            throw new HubException("Only the host can start the match.");

        try
        {
            await _matchOrchestrator.StartMatchAsync(sessionId);
        }
        catch (InvalidOperationException ex)
        {
            throw new HubException(ex.Message);
        }
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
