using Microsoft.AspNetCore.SignalR;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Hubs;
using QuizAPI.Hubs.Clients;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Associations;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Services.QuizSessionServices
{
    /// <summary>
    /// A lobby's Duel while it is being played: what was decided at start, and — once the
    /// countdown is over — the <see cref="AssociationDuel"/> itself. Held on
    /// <see cref="MultiplayerSession.Duel"/>.
    /// </summary>
    public sealed class DuelMatch
    {
        public required int QuizId { get; init; }
        public required string QuizTitle { get; init; }
        public required AssociationBoard Board { get; init; }
        public required AssociationRules Rules { get; init; }
        public required IReadOnlyList<string> Seats { get; init; }
        public required int FirstSeat { get; init; }

        /// <summary>Null during the countdown.</summary>
        public AssociationDuel? Runner { get; set; }

        /// <summary>
        /// Serialises everything that touches <see cref="Runner"/> — hub moves and the loop's clock
        /// ticks — together with its broadcast, so updates reach the room in the order they happened.
        /// </summary>
        public SemaphoreSlim Gate { get; } = new(1, 1);

        /// <summary>
        /// Released after every accepted move or forfeit, to wake the loop: a correct Guess moves the
        /// turn deadline, and a move that ends the Duel should be recorded now, not at the old deadline.
        /// </summary>
        public SemaphoreSlim Changed { get; } = new(0);

        /// <summary>Seated players who left during the countdown; they forfeit the moment the board is up.</summary>
        public List<string> LeftBeforeStart { get; } = new();
    }

    /// <summary>
    /// The Associations Duel in a lobby (docs/quiz/associations.md §10). See
    /// <see cref="IAssociationMatchOrchestrator"/>.
    ///
    /// <para><b>The rules are not here.</b> <see cref="AssociationDuel"/> decides who may act and
    /// what a move does; this class owns what that pure runner can't: the real clock
    /// (<see cref="TimeProvider"/>, so tests drive it), the countdown, keeping the turn clock, the
    /// broadcasts, the one write at the end, and handing the lobby back.</para>
    ///
    /// <para><b>One write, at the end</b> — the same shape as <c>MatchOrchestrator.PersistMatchAsync</c>
    /// (multiplayer.md §7.3): a <see cref="Match"/>, a <see cref="QuizSession"/> per player, the
    /// <see cref="AssociationGame"/> with its players and moves. An interrupted Duel (the lobby
    /// emptied) writes nothing. Unlike Classic, the write comes <i>before</i> the final broadcast:
    /// <c>DuelEnded</c> carries each player's results link, and a link to a row that doesn't exist
    /// yet would 404.</para>
    /// </summary>
    public class AssociationMatchOrchestrator : IAssociationMatchOrchestrator
    {
        private const int CountdownSeconds = 3;

        private readonly IHubContext<QuizHub, IQuizClient> _hub;
        private readonly IQuizSessionManager _sessions;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMatchOrchestrator _lobby;
        private readonly TimeProvider _clock;
        private readonly ILogger<AssociationMatchOrchestrator> _logger;

        public AssociationMatchOrchestrator(
            IHubContext<QuizHub, IQuizClient> hub,
            IQuizSessionManager sessions,
            IServiceScopeFactory scopeFactory,
            IMatchOrchestrator lobby,
            TimeProvider clock,
            ILogger<AssociationMatchOrchestrator> logger)
        {
            _hub = hub;
            _sessions = sessions;
            _scopeFactory = scopeFactory;
            _lobby = lobby;
            _clock = clock;
            _logger = logger;
        }

        /// <summary>
        /// Who opens a lobby's first Duel, given the seat count: at random (D12). Replaceable so
        /// tests can be deterministic.
        /// </summary>
        internal Func<int, int> PickFirstSeat { get; init; } = seats => Random.Shared.Next(seats);

        // Millisecond precision, like Solo: these times are stored, and replay compares them.
        private DateTime Now()
        {
            var now = _clock.GetUtcNow().UtcDateTime;
            return new DateTime(now.Ticks - now.Ticks % TimeSpan.TicksPerMillisecond, DateTimeKind.Utc);
        }

        // ── Starting ────────────────────────────────────────────────────────

        public async Task StartMatchAsync(string sessionId)
        {
            var session = await _sessions.GetSessionAsync(sessionId)
                ?? throw new InvalidOperationException("Lobby not found.");

            // Liveness, not phase — multiplayer.md §3.3.
            if (session.MatchCts != null)
                throw new InvalidOperationException("The match has already started.");
            if (session.QuizState != QuizState.Lobby)
                await _lobby.ResetToLobbyAsync(sessionId);

            if (string.IsNullOrEmpty(session.SelectedQuizId) || !int.TryParse(session.SelectedQuizId, out var quizId))
                throw new InvalidOperationException("Pick a quiz before starting.");

            // Exactly two: a Duel is 1v1 (D4). The lobby's own rule is "at least two" — this is
            // the server's copy of the stricter one the start button shows (multiplayer.md §4.3).
            var participants = await _sessions.GetParticipantsAsync(sessionId);
            if (participants.Count != 2)
                throw new InvalidOperationException("An Associations duel is for exactly 2 players.");

            DuelMatch duel;
            using (var scope = _scopeFactory.CreateScope())
            {
                var games = scope.ServiceProvider.GetRequiredService<IAssociationGameRepository>();
                var boards = scope.ServiceProvider.GetRequiredService<IAssociationBoardRepository>();
                var rulesProvider = scope.ServiceProvider.GetRequiredService<IAssociationRulesProvider>();
                var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();

                // The pick was authorised at selection (QuizHub.SelectQuiz); this only re-reads it,
                // for its current version — the Duel is pinned to it, like a Solo game.
                var quiz = await games.GetQuizAsync(quizId)
                    ?? throw new InvalidOperationException("That quiz is no longer available.");
                if (quiz.Format != QuizFormat.Associations)
                    throw new InvalidOperationException("That quiz isn't an Associations board.");
                var board = await boards.GetForVersionAsync(quiz.Id, quiz.Version)
                    ?? throw new InvalidOperationException("This quiz has no board to play.");

                // Decided now, while the host is certainly still here (multiplayer.md §7.3).
                var host = await users.GetByUsernameAsync(session.HostUsername)
                    ?? throw new InvalidOperationException("The host's account could not be found.");

                var seats = participants.Select(p => p.Username).ToList();
                // D12: random, and a rematch between the same two is opened by the other one.
                var lastOpener = seats.FindIndex(u => string.Equals(u, session.LastDuelOpener, StringComparison.OrdinalIgnoreCase));
                var firstSeat = lastOpener >= 0 ? (lastOpener + 1) % seats.Count : PickFirstSeat(seats.Count);

                duel = new DuelMatch
                {
                    QuizId = quiz.Id,
                    QuizTitle = quiz.Title,
                    Board = board,
                    Rules = rulesProvider.GetRulesFor(quiz.Id),
                    Seats = seats,
                    FirstSeat = firstSeat,
                };

                session.MatchQuizVersion = quiz.Version;
                session.MatchHostUserId = host.Id;
            }

            session.LastDuelOpener = duel.Seats[duel.FirstSeat];
            session.MatchStartedUtc = Now();
            session.Duel = duel;
            session.QuizState = QuizState.Starting;
            session.MatchCts = new CancellationTokenSource();

            var token = session.MatchCts.Token;
            _ = Task.Run(() => RunAsync(sessionId, session, duel, token));
        }

        // ── The loop ────────────────────────────────────────────────────────

        private async Task RunAsync(string sessionId, MultiplayerSession session, DuelMatch duel, CancellationToken ct)
        {
            var room = _hub.Clients.Group(sessionId);
            try
            {
                await room.DuelStarting(CountdownSeconds);
                await Task.Delay(TimeSpan.FromSeconds(CountdownSeconds), _clock, ct);

                await duel.Gate.WaitAsync(ct);
                try
                {
                    var now = Now();
                    duel.Runner = new AssociationDuel(duel.Board, duel.Rules, duel.Seats, duel.FirstSeat, now, duel.QuizId, duel.QuizTitle);
                    session.QuizState = QuizState.InProgress;
                    await room.DuelStarted(duel.Runner.View(now));

                    foreach (var left in duel.LeftBeforeStart)
                        if (duel.Runner.Forfeit(left, now) is { } forfeit)
                            await room.DuelUpdated(forfeit);
                }
                finally { duel.Gate.Release(); }

                // Moves arrive through the hub; the loop only keeps the turn clock. It sleeps until
                // the current deadline or until a move changes things (Changed), whichever is first,
                // then looks again — so a correct Guess, which moves the deadline, and a move that
                // ends the Duel are both picked up at once.
                while (!duel.Runner.IsOver)
                {
                    var wait = duel.Runner.TurnDeadline - Now();
                    using (var wake = CancellationTokenSource.CreateLinkedTokenSource(ct))
                    {
                        var clock = Task.Delay(wait > TimeSpan.Zero ? wait : TimeSpan.Zero, _clock, wake.Token);
                        var moved = duel.Changed.WaitAsync(wake.Token);
                        await Task.WhenAny(clock, moved);
                        wake.Cancel();
                    }
                    ct.ThrowIfCancellationRequested();

                    await duel.Gate.WaitAsync(ct);
                    try
                    {
                        if (duel.Runner.ExpireTurnIfDue(Now()) is { } expired)
                            await room.DuelUpdated(expired);
                    }
                    finally { duel.Gate.Release(); }
                }

                await FinishAsync(sessionId, session, duel);
            }
            catch (OperationCanceledException)
            {
                // The lobby emptied. If the Duel had already ended (a forfeit, then the other player
                // left too) it is still a result, and it is recorded; otherwise it is half a game,
                // which is not a record of anything.
                if (duel.Runner?.IsOver == true)
                    await FinishAsync(sessionId, session, duel);
                else
                    _logger.LogInformation("Duel {SessionId} was cancelled.", sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Duel {SessionId} failed.", sessionId);
            }
            finally
            {
                session.MatchCts?.Dispose();
                session.MatchCts = null;
                // The shared reset — the same one the Classic loop runs from its finally
                // (multiplayer.md §3.2). It clears session.Duel too.
                await _lobby.ResetToLobbyAsync(sessionId);
            }
        }

        private async Task FinishAsync(string sessionId, MultiplayerSession session, DuelMatch duel)
        {
            var runner = duel.Runner!;
            session.QuizState = QuizState.QuizEnded;

            var recorded = false;
            try
            {
                await RecordAsync(sessionId, session, duel, runner);
                recorded = true;
            }
            catch (Exception ex)
            {
                // The players still get their result; what is lost is the record (and so the links).
                _logger.LogError(ex, "Duel {SessionId} finished but could not be recorded.", sessionId);
            }

            var view = runner.View(Now());
            if (!recorded)
                foreach (var seat in view.Seats) seat.SessionId = null;
            await _hub.Clients.Group(sessionId).DuelEnded(view);
        }

        /// <summary>
        /// The one write. Every seated player gets a session — unlike Classic, where a player who
        /// never answered gets none (multiplayer.md §7.2): a Duel is two Seats on one Board, a
        /// player can lose without ever having had a turn (the opponent took the Final), and replay
        /// needs every Seat's row to know who sat where.
        /// </summary>
        private async Task RecordAsync(string sessionId, MultiplayerSession session, DuelMatch duel, AssociationDuel runner)
        {
            using var scope = _scopeFactory.CreateScope();
            var games = scope.ServiceProvider.GetRequiredService<IAssociationGameRepository>();
            var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            var game = runner.Game;
            var endedAt = game.EndedAt ?? Now();

            var userIds = new Guid?[runner.Usernames.Count];
            for (var seat = 0; seat < userIds.Length; seat++)
                userIds[seat] = (await users.GetByUsernameAsync(runner.Usernames[seat]))?.Id;

            var match = new Match
            {
                Id = Guid.NewGuid(),
                QuizId = duel.QuizId,
                QuizVersion = session.MatchQuizVersion,
                RoomCode = sessionId,
                HostUserId = session.MatchHostUserId,
                StartedAt = game.StartedAt,
                EndedAt = endedAt,
                WinnerUserId = runner.WinnerSeat is int w ? userIds[w] : null,
            };
            games.AddMatch(match);

            for (var seat = 0; seat < userIds.Length; seat++)
            {
                if (userIds[seat] is not Guid userId)
                {
                    // Account closed mid-Duel: no session for it, and so no seat row either (the FK).
                    var orphan = game.Players.First(p => p.Seat == seat);
                    game.Players.Remove(orphan);
                    continue;
                }

                games.AddSession(new QuizSession
                {
                    Id = runner.SessionIds[seat],
                    QuizId = duel.QuizId,
                    UserId = userId,
                    StartTime = game.StartedAt,
                    EndTime = endedAt,
                    TotalScore = runner.State.Scores[seat],
                    IsCompleted = true,
                    QuizVersion = session.MatchQuizVersion,
                    Mode = QuizSessionMode.Multiplayer,
                    MatchId = match.Id,
                });
            }

            game.MatchId = match.Id;
            game.EndedAt = endedAt;
            games.AddGame(game);
            await games.SaveChangesAsync();

            _logger.LogInformation("Duel {SessionId} recorded as match {MatchId}.", sessionId, match.Id);
        }

        // ── Moves ───────────────────────────────────────────────────────────

        public Task OpenTileAsync(string sessionId, string username, int tileId) =>
            MoveAsync(sessionId, runner => runner.Open(username, tileId, Now()));

        public Task GuessAsync(string sessionId, string username, string target, string text) =>
            MoveAsync(sessionId, runner => runner.Guess(username, target, text, Now()));

        public Task PassAsync(string sessionId, string username) =>
            MoveAsync(sessionId, runner => runner.Pass(username, Now()));

        private async Task MoveAsync(string sessionId, Func<AssociationDuel, DuelUpdateDTO> move)
        {
            var session = await _sessions.GetSessionAsync(sessionId);
            var duel = session?.Duel ?? throw new DuelMoveException("There's no duel running.");

            await duel.Gate.WaitAsync();
            try
            {
                var runner = duel.Runner ?? throw new DuelMoveException("The duel hasn't started yet.");
                var update = move(runner);
                duel.Changed.Release();
                await _hub.Clients.Group(sessionId).DuelUpdated(update);
            }
            finally { duel.Gate.Release(); }
        }

        public async Task PlayerLeftAsync(string sessionId, string username)
        {
            var session = await _sessions.GetSessionAsync(sessionId);
            if (session?.Duel is not { } duel) return;
            if (!duel.Seats.Any(s => string.Equals(s, username, StringComparison.OrdinalIgnoreCase))) return;

            await duel.Gate.WaitAsync();
            try
            {
                if (duel.Runner is null)
                {
                    duel.LeftBeforeStart.Add(username);
                    return;
                }
                // The loop sees the Duel is over on its next poll, records it and announces the end.
                if (duel.Runner.Forfeit(username, Now()) is { } update)
                {
                    duel.Changed.Release();
                    await _hub.Clients.Group(sessionId).DuelUpdated(update);
                }
            }
            finally { duel.Gate.Release(); }
        }

        public async Task<DuelViewDTO?> CurrentViewAsync(string sessionId)
        {
            var session = await _sessions.GetSessionAsync(sessionId);
            if (session?.Duel is not { } duel) return null;

            await duel.Gate.WaitAsync();
            try { return duel.Runner?.View(Now()); }
            finally { duel.Gate.Release(); }
        }
    }
}
