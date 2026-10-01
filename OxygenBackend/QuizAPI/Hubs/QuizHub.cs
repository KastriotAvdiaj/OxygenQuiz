using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Data;
using QuizAPI.Hubs.Clients;
using QuizAPI.Services.Associations;
using QuizAPI.Services.Interfaces;
using QuizAPI.Services.QuizSessionServices;

namespace QuizAPI.Hubs;

[Authorize]
public class QuizHub : Hub<IQuizClient>
{
    private readonly IQuizSessionManager _sessionManager;
    /// <summary>
    /// A factory, not the hub's own <c>IServiceProvider</c>: that one is the invocation's scope and
    /// is disposed as soon as the invocation returns — which the disconnect grace, 5 seconds
    /// later, used to find out by throwing (multiplayer.md §3.5).
    /// </summary>
    private readonly IServiceScopeFactory _scopes;
    private readonly TimeProvider _clock;
    private readonly ILogger<QuizHub> _logger;
    private readonly IMatchOrchestrator _matchOrchestrator;
    private readonly IAssociationMatchOrchestrator _duels;

    public QuizHub(
        IQuizSessionManager sessionManager,
        IServiceScopeFactory scopes,
        IMatchOrchestrator matchOrchestrator,
        IAssociationMatchOrchestrator duels,
        TimeProvider clock,
        ILogger<QuizHub> logger)
    {
        _logger = logger;
        _sessionManager = sessionManager;
        _scopes = scopes;
        _clock = clock;
        _matchOrchestrator = matchOrchestrator;
        _duels = duels;
    }

    // The participant's identity is ALWAYS the authenticated account's id — never trusted from
    // the client, and never the name. The name used to come from the JWT's "username" claim and
    // double as the identity, which broke once display names became changeable: the claim is
    // stale until the token refreshes, and the match was saved by matching the name against
    // ImmutableName. Now: the id is the identity, the display name is read fresh from the database
    // when a connection enters a lobby, and from then on the session's pinned name (stored in
    // Context.Items) is what this connection plays under. See MultiplayerSession.PlayerUserIds.
    private string CurrentPlayerName() =>
        Context.Items["Username"] as string
        ?? throw new HubException("You are not in this lobby.");

    // The authenticated account's id, read the same way as CurrentUserService (NameIdentifier with a
    // 'sub' fallback so it works regardless of inbound claim mapping).
    private Guid GetUserId()
    {
        var raw = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(raw, out var id)
            ? id
            : throw new HubException("You must be logged in.");
    }

    // Same test as CurrentUserService.IsAdmin — the hub has the same principal, not an HttpContext.
    private bool IsAdmin() =>
        Context.User?.IsInRole("Admin") == true || Context.User?.IsInRole("SuperAdmin") == true;

    /// <summary>Admin, SuperAdmin or Teacher — who may see a format in preview (QuizFormatAccess).</summary>
    private bool CanSeePreviewFormats() =>
        IsAdmin() || Context.User?.IsInRole(QuizAPI.Services.Roles.RoleRules.Teacher) == true;

    /// <summary>
    /// The authenticated account's current display name and avatar, read from the database once
    /// per join/create — not from the token, whose name claim lags a rename until it refreshes.
    /// </summary>
    private async Task<(string Username, string? ProfileImageUrl)> GetAccountAsync()
    {
        var userId = GetUserId();
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var account = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => new { u.Username, u.ProfileImageUrl })
            .FirstOrDefaultAsync()
            ?? throw new HubException("You must be logged in.");
        return (account.Username, account.ProfileImageUrl);
    }

    /// <summary>
    /// Non-mutating "can I join this code?" lookup. The join dialog calls this before navigating so
    /// a wrong code is rejected in place instead of dumping the player on the lobby route in a
    /// failed state. Advisory only — <see cref="JoinSession"/> re-checks and is the real gate.
    /// </summary>
    public async Task<SessionAvailability> CheckSession(string sessionId)
    {
        return await _sessionManager.CheckSessionAsync(sessionId, GetUserId());
    }

    public async Task JoinSession(string sessionId)
    {
        var (accountName, profileImageUrl) = await GetAccountAsync();

        // 1. Add to Session Manager (Persist State).
        //    This runs BEFORE the group add on purpose: it's the step that can reject the join, and
        //    a connection added to the group first would stay subscribed to that group's broadcasts
        //    after the failure.
        // Already in the roster means this is the same person coming back on a new connection —
        // a page refresh, the host's second join after CreateSession, or the client's automatic
        // rejoin after a reconnect (docs/quiz/multiplayer.md §3.6). Everyone already has them.
        // Matched by account, not by name — the name is a pinned label that a rename doesn't move.
        var userId = GetUserId();
        var isRejoin = (await _sessionManager.GetParticipantsAsync(sessionId))
            .Any(p => p.UserId == userId);

        Participant participant;
        try
        {
            participant = await _sessionManager.AddParticipantAsync(
                sessionId, userId, accountName, Context.ConnectionId, profileImageUrl);
        }
        catch (SessionJoinException ex)
        {
            // HubException is the only exception SignalR relays verbatim (EnableDetailedErrors is
            // off); anything else reaches the browser as "An unexpected error occurred" and the
            // client can't tell "no such room" from "lobby full".
            throw new HubException(ex.Message);
        }

        // The name this account plays under in this lobby — pinned at its first join, so it can
        // differ from accountName if they renamed since. Everything below uses it.
        var username = participant.Username;

        // 2. Add to SignalR Group
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);

        // 3. Store in Context for OnDisconnected handling
        Context.Items["SessionId"] = sessionId;
        Context.Items["Username"] = username;

        // 4. Broadcast to others that user joined (avatar included so existing
        //    clients can render it without a refetch)
        //    Not for a rejoin: the others never saw them leave (UserLeft is sent only when the
        //    participant record goes), so announcing them again would toast "X joined the lobby"
        //    at the room for a network blip.
        if (!isRejoin)
            await Clients.Group(sessionId).UserJoined(username, participant.IsHost, participant.ProfileImageUrl);

        // 5. Send CURRENT participants to the NEW user
        var currentParticipants = await _sessionManager.GetParticipantsAsync(sessionId);
        await Clients.Caller.CurrentParticipants(currentParticipants);

        // 5b. Send the lobby's configured max-player count so the client can render the
        //     player grid at its real size (empty slots up to the limit).
        var session = await _sessionManager.GetSessionAsync(sessionId);
        if (session != null)
        {
            await Clients.Caller.LobbySettingsChanged(session.LobbyName, session.MaxPlayers);

            // 5c. Replay the host's quiz pick if one was made before this player arrived —
            //     QuizSelected is only broadcast at selection time, so without this a late
            //     joiner sits on "waiting for the host to select a quiz" forever.
            if (session.SelectedQuiz != null)
                await Clients.Caller.QuizSelected(session.SelectedQuiz);
        }

        // 6. Send the chat this caller is entitled to see — messages from their join onward only.
        //    A new arrival must not be able to read what was said before they were in the room;
        //    a reconnecting participant keeps theirs, because FirstJoinedAt survives the rejoin.
        //    Runs after step 2 on purpose: the participant record has to exist for the watermark
        //    to be found.
        var visibleMessages = await _sessionManager.GetMessagesSinceJoinAsync(sessionId, username);
        await Clients.Caller.ChatHistory(visibleMessages);

        // 7. A Duel in progress is announced only by broadcasts, so a player arriving — or coming
        //    back after a reconnect, which is the case that matters — gets the board as it stands
        //    (the late-joiner rule, docs/quiz/multiplayer.md §2).
        if (await _duels.CurrentViewAsync(sessionId) is { } duel)
            await Clients.Caller.DuelState(duel);
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

    public async Task LeaveSession(string sessionId)
    {
        // Leaving a lobby this connection never joined (a stale tab, a reconnect that hadn't
        // rejoined yet) is a no-op, not an error — there is nothing to leave.
        if (Context.Items["Username"] is not string username)
            return;
        var wasHost = await _sessionManager.IsHostAsync(sessionId, username);
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
        
        await _sessionManager.RemoveParticipantAsync(sessionId, username);
        
        // Clear Context items as they cleanly left
        Context.Items.Remove("SessionId");
        Context.Items.Remove("Username");

        await Clients.Group(sessionId).UserLeft(username);

        // Leaving mid-Duel is a forfeit (D10). A no-op when no Duel is on or they aren't seated.
        await _duels.PlayerLeftAsync(sessionId, username);
        
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

    /// <summary>How long a dropped connection has to come back before the player is removed (multiplayer.md §3.5).</summary>
    private static readonly TimeSpan DisconnectGrace = TimeSpan.FromSeconds(5);

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
                // Fire-and-forget, so a failure in here reaches nobody unless it is logged: this
                // path once threw on every disconnect without a trace (multiplayer.md §3.5).
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await Task.Delay(DisconnectGrace, _clock);

                        using var scope = _scopes.CreateScope();
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

                            // Gone for good (they didn't reconnect within the grace): a Duel they were
                            // seated in is forfeited, the same as leaving on purpose.
                            var duels = scope.ServiceProvider.GetRequiredService<IAssociationMatchOrchestrator>();
                            await duels.PlayerLeftAsync(sessionId, username);
                        
                            if (wasHost)
                            {
                                var newHostUsername = await sessionManager.GetHostUsernameAsync(sessionId);
                                if (newHostUsername != null)
                                {
                                    await hubContext.Clients.Group(sessionId).HostChanged(newHostUsername);
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Removing {Username} from lobby {SessionId} after a disconnect failed.", username, sessionId);
                    }
                });
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Records a player's answer for the current question. The server grades it later (when the
    // round closes) — nothing about correctness is sent back here. First submission of the round
    // wins; late or duplicate submissions are ignored.
    // clientElapsedMs is the player's own think-time measurement (see RoundAnswer.ClientElapsedMs);
    // it is stored raw here and validated at grading time. The deadline check above it stays on
    // the SERVER clock — a client report can never resurrect a late answer.
    public async Task SubmitAnswer(string sessionId, string answer, long? clientElapsedMs = null)
    {
        var username = CurrentPlayerName();
        var session = await _sessionManager.GetSessionAsync(sessionId);
        if (session is null || session.QuizState != QuizState.QuestionActive)
            return; // not accepting answers right now

        if (DateTime.UtcNow > session.QuestionDeadlineUtc)
            return; // too late

        var record = new RoundAnswer
        {
            Raw = answer,
            SubmittedUtc = DateTime.UtcNow,
            ClientElapsedMs = clientElapsedMs,
        };
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

        // Dispatch by format. SelectedQuiz.Format is the server's own (SelectQuiz fills it from the
        // quiz), so it can be trusted here; each orchestrator re-checks the quiz anyway.
        var session = await _sessionManager.GetSessionAsync(sessionId);
        var isBoard = session?.SelectedQuiz?.Format == nameof(QuizAPI.Models.Quiz.QuizFormat.Associations);

        try
        {
            if (isBoard)
                await _duels.StartMatchAsync(sessionId);
            else
                await _matchOrchestrator.StartMatchAsync(sessionId);
        }
        catch (InvalidOperationException ex)
        {
            throw new HubException(ex.Message);
        }
    }

    // ── Associations Duel moves (docs/quiz/associations.md §10) ──
    // The player is this connection's pinned lobby name (set by JoinSession), never a parameter. Whose turn it is, and whether the
    // move is legal, is the Duel runner's call; a refusal reaches the player as its sentence.

    public Task OpenTile(string sessionId, int tileId) =>
        DuelMove(() => _duels.OpenTileAsync(sessionId, CurrentPlayerName(), tileId));

    public Task GuessAssociation(string sessionId, string target, string text) =>
        DuelMove(() => _duels.GuessAsync(sessionId, CurrentPlayerName(), target, text));

    public Task PassTurn(string sessionId) =>
        DuelMove(() => _duels.PassAsync(sessionId, CurrentPlayerName()));

    private static async Task DuelMove(Func<Task> move)
    {
        try
        {
            await move();
        }
        catch (DuelMoveException ex)
        {
            // A move from the wrong Seat is a bug in the other client worth seeing, not something
            // to drop silently (docs/quiz/associations.md §10.3) — and a late one is worth telling the player about.
            throw new HubException(ex.Message);
        }
    }

    public async Task ToggleReady(string sessionId, bool isReady)
    {
        var username = CurrentPlayerName();
        await _sessionManager.SetPlayerReadyAsync(sessionId, username, isReady);
        await Clients.Group(sessionId).PlayerReadyChanged(username, isReady);
    }

    public async Task CreateSession(string sessionId, string lobbyName, int maxPlayers)
    {
        var (username, profileImageUrl) = await GetAccountAsync();
        try
        {
            // Create session with settings
            var session = await _sessionManager.CreateSessionAsync(
                sessionId, lobbyName, maxPlayers, GetUserId(), username, Context.ConnectionId, profileImageUrl);
            
            // Add to SignalR Group
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            
            // Store in Context for disconnect handling
            Context.Items["SessionId"] = sessionId;
            Context.Items["Username"] = username;
            
            // Send session info to creator
            await Clients.Caller.CurrentParticipants(session.Participants);
            await Clients.Caller.LobbySettingsChanged(session.LobbyName, session.MaxPlayers);
        }
        catch (InvalidOperationException ex)
        {
            // Session already exists - throw error to client
            throw new HubException(ex.Message);
        }
    }

    public async Task SelectQuiz(string sessionId, SelectedQuizView quiz)
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

        // Validate the selection server-side — never trust the client-supplied quiz id. The host may
        // only host a Public quiz or one they own (see docs/quiz/quiz-visibility.md). This closes the gap
        // where a crafted call could host any quiz regardless of the "public only" picker UI.
        if (quiz is null || !int.TryParse(quiz.Id, out var parsedQuizId))
            throw new HubException("Invalid quiz.");

        var hostUserId = GetUserId();
        using (var scope = _scopes.CreateScope())
        {
            var quizService = scope.ServiceProvider.GetRequiredService<IQuizService>();
            if (!await quizService.CanHostQuizAsync(parsedQuizId, hostUserId))
                throw new HubException("You can't host this quiz.");

            // A board is played as a Duel (StartMatch dispatches on this). While the format is in
            // preview only an admin may host one — refused with the same sentence as a quiz they
            // can't host at all, so a player learns nothing about what the id is
            // (docs/quiz/associations.md §0).
            var format = await quizService.GetFormatAsync(parsedQuizId) ?? QuizAPI.Models.Quiz.QuizFormat.Classic;
            if (!QuizAPI.Common.QuizFormatAccess.IsAvailableTo(format, CanSeePreviewFormats()))
                throw new HubException("You can't host this quiz.");

            // The format is the server's, whatever the payload said: the lobby's rules follow from
            // it (a board needs exactly 2 players), so it must not be the client's to choose.
            quiz = new SelectedQuizView
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Category = quiz.Category,
                Difficulty = quiz.Difficulty,
                QuestionCount = quiz.QuestionCount,
                Format = format.ToString(),
            };
        }

        // Set quiz. The whole payload is stored, not just the id, so JoinSession can replay it
        // to anyone who arrives after this point.
        await _sessionManager.SetQuizAsync(sessionId, quiz);

        // Broadcast to all participants. Only the id was authorized above; the title/category/
        // difficulty ride along purely as display labels (see SelectedQuizView).
        await Clients.Group(sessionId).QuizSelected(quiz);
    }
}
