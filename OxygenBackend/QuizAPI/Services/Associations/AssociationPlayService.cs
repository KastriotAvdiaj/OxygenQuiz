using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Associations
{
    public interface IAssociationPlayService
    {
        /// <summary>
        /// Starts a Solo game — or, if this player already has one of this quiz running, returns
        /// that one with <see cref="AssociationGameViewDTO.Resumed"/> set.
        /// </summary>
        Task<AssociationGameViewDTO> StartAsync(Guid userId, int quizId, string? shareToken);

        /// <summary>The current view. Ends the game as <c>TimeUp</c> first if its deadline has passed.</summary>
        Task<AssociationGameViewDTO> GetAsync(Guid sessionId, Guid userId, bool isAdmin);

        /// <summary>
        /// The review of a Duel this player played — the one read open to a non-admin while the
        /// format is in preview (docs/quiz/associations.md §0, §10.6). Anything else is "not found".
        /// </summary>
        Task<AssociationGameViewDTO> GetOwnDuelAsync(Guid sessionId, Guid userId);

        Task<AssociationMoveResultDTO> OpenTileAsync(Guid sessionId, Guid userId, int tileId);

        Task<AssociationMoveResultDTO> GuessAsync(Guid sessionId, Guid userId, string target, string text);

        Task<AssociationGameViewDTO> GiveUpAsync(Guid sessionId, Guid userId);

        /// <summary>Abandons this game (if it is still running) and starts a fresh one of the same quiz.</summary>
        Task<AssociationGameViewDTO> RestartAsync(Guid sessionId, Guid userId, string? shareToken);
    }

    /// <summary>
    /// Solo play of an Associations Board (docs/quiz/associations.md, "Playing").
    ///
    /// <para><b>Every request replays.</b> The game's state is never stored: each call loads the
    /// move log and replays it through <see cref="AssociationEngine"/> under the game's own rules
    /// snapshot (ADR 0020), applies the new move to the result, and appends it. So resume, a
    /// refresh, the results page and a move all see the same game by construction.</para>
    ///
    /// <para><b>The clock is the server's.</b> The deadline is stamped from <see cref="TimeProvider"/>
    /// at start; a request that arrives after it ends the game as <c>TimeUp</c> instead of making its
    /// move. Nothing advances while the player is away — the game is settled lazily, the next time
    /// anyone asks (or by the abandonment sweep).</para>
    ///
    /// <para><b>Access.</b> Starting uses the same play rule as Classic (<see cref="QuizPlayAccess"/>);
    /// a session belongs to its player, and anyone else — including someone probing ids — gets
    /// "not found". Admins may read another player's game but never move in it. The preview gate
    /// (<see cref="QuizFormatAccess"/>) is the controller's.</para>
    /// </summary>
    public class AssociationPlayService : IAssociationPlayService
    {
        private const string QuizNotAvailable = "Quiz not found or not available.";
        private const string SessionNotFound = "Game not found.";

        private readonly IAssociationGameRepository _games;
        private readonly IAssociationBoardRepository _boards;
        private readonly IAssociationRulesProvider _rules;
        private readonly TimeProvider _clock;

        public AssociationPlayService(
            IAssociationGameRepository games,
            IAssociationBoardRepository boards,
            IAssociationRulesProvider rules,
            TimeProvider clock)
        {
            _games = games;
            _boards = boards;
            _rules = rules;
            _clock = clock;
        }

        // Millisecond precision: PostgreSQL keeps microseconds, and a deadline computed from a
        // stored StartedAt must land exactly on the stored DeadlineUtc.
        private DateTime Now()
        {
            var now = _clock.GetUtcNow().UtcDateTime;
            return new DateTime(now.Ticks - now.Ticks % TimeSpan.TicksPerMillisecond, DateTimeKind.Utc);
        }

        // ── Start ──────────────────────────────────────────────────────────

        public async Task<AssociationGameViewDTO> StartAsync(Guid userId, int quizId, string? shareToken)
        {
            var quiz = await _games.GetQuizAsync(quizId);
            // Same answer whether the quiz is missing or just not yours to play, so ids and tokens
            // can't be probed.
            if (quiz is null || !QuizPlayAccess.IsPlayAuthorized(quiz, userId, shareToken))
                throw new NotFoundException(QuizNotAvailable);

            // After authorization, so the format of a quiz the caller may not see isn't revealed.
            QuizFormatGuard.EnsureFormat(quiz.Format, QuizFormat.Associations);

            var now = Now();

            var running = await _games.GetUnfinishedSoloSessionAsync(userId, quizId);
            if (running is not null)
            {
                var loaded = await LoadAsync(running);
                if (!loaded.State.IsOver)
                {
                    var view = Build(loaded, now);
                    view.Resumed = true;
                    return view;
                }
                // It ran out of time while the player was away. It is now settled (TimeUp, with
                // the points they had), and they get the fresh game they asked for.
                await _games.SaveChangesAsync();
            }

            return await CreateAsync(quiz, userId, now);
        }

        private async Task<AssociationGameViewDTO> CreateAsync(Quiz quiz, Guid userId, DateTime now)
        {
            // The Board as of the quiz's current version — the session pins that version, so an
            // edit made mid-game can't change what this player is playing (copy-on-write).
            var board = await _boards.GetForVersionAsync(quiz.Id, quiz.Version)
                ?? throw new AppValidationException("This quiz has no board to play.");

            var rules = _rules.GetRulesFor(quiz.Id);
            // The authoring validator keeps TimeLimitInSeconds inside the rules' range; the default
            // covers a row that predates it.
            var boardSeconds = quiz.TimeLimitInSeconds is > 0 and int seconds ? seconds : rules.SoloDefaultBoardSeconds;

            var session = new QuizSession
            {
                Id = Guid.NewGuid(),
                QuizId = quiz.Id,
                UserId = userId,
                QuizVersion = quiz.Version,
                StartTime = now,
                Mode = QuizSessionMode.SinglePlayer,
            };

            var game = new AssociationGame
            {
                Id = Guid.NewGuid(),
                // The id only: the Board was read untracked, and attaching it here would make EF
                // insert it again.
                BoardId = board.Id,
                PlayStyle = PlayStyle.Solo,
                FirstSeat = 0,
                StartedAt = now,
                DeadlineUtc = now.AddSeconds(boardSeconds),
                // The snapshot: this game is scored by these numbers for good (ADR 0020).
                RulesJson = rules.ToJson(),
            };
            game.Players.Add(new AssociationGamePlayer { GameId = game.Id, SessionId = session.Id, Seat = 0 });

            _games.AddSession(session);
            _games.AddGame(game);
            await _games.SaveChangesAsync();

            var state = AssociationEngine.StartSolo(game.StartedAt, boardSeconds);
            return AssociationViews.Build(session.Id, quiz.Id, quiz.Title, game, board, state, rules, now);
        }

        // ── Read ───────────────────────────────────────────────────────────

        public async Task<AssociationGameViewDTO> GetAsync(Guid sessionId, Guid userId, bool isAdmin)
        {
            var session = await _games.GetSessionAsync(sessionId);
            if (session is null || (session.UserId != userId && !isAdmin))
                throw new NotFoundException(SessionNotFound);

            var loaded = await LoadAsync(session);
            await _games.SaveChangesAsync();   // persists a TimeUp that LoadAsync just settled, if any
            return Build(loaded, Now());
        }

        public async Task<AssociationGameViewDTO> GetOwnDuelAsync(Guid sessionId, Guid userId)
        {
            var session = await _games.GetSessionAsync(sessionId);
            // A Duel session is a Multiplayer one; checked before loading, so a Solo game — this
            // player's or anyone's — stays behind the preview gate exactly as before.
            if (session is null || session.UserId != userId || session.Mode != QuizSessionMode.Multiplayer)
                throw new NotFoundException(SessionNotFound);

            var loaded = await LoadAsync(session);
            if (loaded.Game.PlayStyle != PlayStyle.Duel)
                throw new NotFoundException(SessionNotFound);
            return Build(loaded, Now());
        }

        // ── Moves ──────────────────────────────────────────────────────────

        public Task<AssociationMoveResultDTO> OpenTileAsync(Guid sessionId, Guid userId, int tileId) =>
            MoveAsync(sessionId, userId, (seat, at) => AssociationMove.Open(seat, tileId, at));

        public Task<AssociationMoveResultDTO> GuessAsync(Guid sessionId, Guid userId, string target, string text)
        {
            if (!AssociationMoveInput.TryParseTarget(target, out var parsed))
                throw new AppValidationException(AssociationMoveInput.BadTarget);
            if (AssociationMoveInput.CheckGuess(text, out var trimmed) is string problem)
                throw new AppValidationException(problem);

            return MoveAsync(sessionId, userId, (seat, at) => AssociationMove.Guess(seat, parsed, trimmed, at));
        }

        public async Task<AssociationGameViewDTO> GiveUpAsync(Guid sessionId, Guid userId) =>
            (await MoveAsync(sessionId, userId, (seat, at) => AssociationMove.GiveUp(seat, at))).Game;

        private async Task<AssociationMoveResultDTO> MoveAsync(
            Guid sessionId, Guid userId, Func<int, DateTime, AssociationMove> makeMove)
        {
            var session = await _games.GetSessionAsync(sessionId);
            // Moves are the player's own: an admin may look at someone's game, never play it.
            if (session is null || session.UserId != userId)
                throw new NotFoundException(SessionNotFound);

            var loaded = await LoadAsync(session);
            var now = Now();

            if (loaded.State.IsOver)
            {
                // Settled just now by the clock: the move is too late to count, and the answer is
                // the finished Board. Anything else that's over was already over.
                if (loaded.SettledNow)
                {
                    await _games.SaveChangesAsync();
                    return new AssociationMoveResultDTO { Game = Build(loaded, now) };
                }
                throw new AppValidationException("This game is already over.");
            }

            var seat = loaded.Game.Players.First(p => p.SessionId == sessionId).Seat;
            var move = makeMove(seat, now);
            var outcome = AssociationEngine.Apply(loaded.State, loaded.Key, loaded.Rules, move);

            if (!outcome.Accepted)
                throw new AppValidationException(AssociationMoveInput.Describe(outcome.Rejection!.Value));

            var record = new AssociationGameMove
            {
                GameId = loaded.Game.Id,
                Seq = outcome.State.MoveCount,
                Seat = seat,
                Kind = move.Kind,
                TileId = move.TileId,
                Target = move.Target,
                GuessText = move.GuessText,
                IsCorrect = outcome.IsCorrect,
                Points = outcome.Points,
                At = now,
            };
            _games.AddMove(record);
            // EF's fix-up usually adds it to the tracked game's collection already; the view below
            // must see it either way.
            if (!loaded.Game.Moves.Contains(record)) loaded.Game.Moves.Add(record);

            // The session's TotalScore follows every scoring move, not just the last one, so a game
            // that ends any other way — the clock, the abandonment sweep — already has its score.
            session.TotalScore = outcome.State.Scores[seat];

            if (outcome.GameEnded is GameEndReason reason)
                Finish(loaded.Game, session, reason, now, outcome.State.Scores[seat]);

            try
            {
                await _games.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // The unique (GameId, Seq) index: another request appended this move number first —
                // a double click, or two tabs. Nothing of this request was saved.
                throw new ConflictException("The board changed while you were playing it. Refresh to see where it stands.");
            }

            return new AssociationMoveResultDTO
            {
                Game = Build(loaded with { State = outcome.State }, now),
                IsCorrect = outcome.IsCorrect,
                Points = outcome.Points,
                SolvedColumns = outcome.SolvedColumns.Select(c => c.ToString()).ToList(),
                FinalSolved = outcome.FinalSolved,
            };
        }

        // ── Restart ────────────────────────────────────────────────────────

        public async Task<AssociationGameViewDTO> RestartAsync(Guid sessionId, Guid userId, string? shareToken)
        {
            var session = await _games.GetSessionAsync(sessionId);
            if (session is null || session.UserId != userId)
                throw new NotFoundException(SessionNotFound);

            // May they start the replacement? Checked before anything is ended, so a refused restart
            // (an Unlisted board without its share token) leaves the running game alone.
            var quiz = await _games.GetQuizAsync(session.QuizId);
            if (quiz is null || !QuizPlayAccess.IsPlayAuthorized(quiz, userId, shareToken))
                throw new NotFoundException(QuizNotAvailable);

            var loaded = await LoadAsync(session);
            var now = Now();

            // Already finished is not an obstacle to starting again — it is the normal state of the
            // thing being replaced (the same rule as Classic's abandon-and-create).
            if (!loaded.State.IsOver)
            {
                loaded.Game.EndReason = GameEndReason.Abandoned;
                loaded.Game.EndedAt = now;
                session.IsCompleted = true;
                session.EndTime = now;
                session.AbandonmentReason = AbandonmentReason.UserInitiated;
                session.AbandonedAt = now;
            }
            await _games.SaveChangesAsync();

            return await StartAsync(userId, session.QuizId, shareToken);
        }

        // ── Loading and settling ───────────────────────────────────────────

        private sealed record Loaded(
            QuizSession Session,
            AssociationGame Game,
            BoardKey Key,
            AssociationRules Rules,
            AssociationState State,
            bool SettledNow)
        {
            /// <summary>A Duel's Seats with names and scores; null for Solo.</summary>
            public List<DuelSeatDTO>? DuelSeats { get; init; }
            public int? DuelWinner { get; init; }
        }

        /// <summary>
        /// Loads a session's game and replays it. If the Solo deadline has passed and the game is
        /// still open, it is settled here as <c>TimeUp</c> (tracked, not yet saved — the caller saves).
        /// </summary>
        private async Task<Loaded> LoadAsync(QuizSession session)
        {
            var game = await _games.GetGameForSessionAsync(session.Id)
                ?? throw new NotFoundException(SessionNotFound);   // a Classic session: not ours to serve

            var rules = AssociationRules.FromJson(game.RulesJson);   // the snapshot, never current config
            var key = AssociationBoardMapping.ToKey(game.Board);
            var start = game.PlayStyle == PlayStyle.Solo
                ? AssociationEngine.StartSolo(game.StartedAt, (int)Math.Round((game.DeadlineUtc!.Value - game.StartedAt).TotalSeconds))
                : AssociationEngine.StartDuel(game.StartedAt, game.SeatCount, game.FirstSeat);

            var moves = game.Moves.OrderBy(m => m.Seq).Select(ToEngineMove);
            var serverEnd = game.EndReason is GameEndReason.TimeUp or GameEndReason.Forfeit or GameEndReason.Abandoned
                ? game.EndReason
                : null;
            var state = AssociationEngine.Replay(start, key, rules, moves, serverEnd);

            var settled = false;
            if (!state.IsOver && state.Deadline is DateTime deadline && Now() >= deadline)
            {
                state = AssociationEngine.End(state, GameEndReason.TimeUp);
                Finish(game, session, GameEndReason.TimeUp, deadline, state.Scores[0]);
                settled = true;
            }

            var loaded = new Loaded(session, game, key, rules, state, settled);
            return game.PlayStyle == PlayStyle.Duel ? await WithDuelSeatsAsync(loaded) : loaded;
        }

        /// <summary>
        /// A Duel's Seats, named, and its winner. The winner is the recorded one (the <c>Match</c>),
        /// not recomputed: a forfeit is won by the player still there whatever the score, and replay
        /// can't tell who left.
        /// </summary>
        private async Task<Loaded> WithDuelSeatsAsync(Loaded loaded)
        {
            var game = loaded.Game;
            var players = await _games.GetPlayersOfSessionsAsync(game.Players.Select(p => p.SessionId).ToList());

            string NameOf(int seat) =>
                game.Players.FirstOrDefault(p => p.Seat == seat) is { } row
                && players.TryGetValue(row.SessionId, out var who) && who.Username is string name
                    ? name
                    // Their session was deleted (the game is still the other player's record), or
                    // their account closed: the Seat keeps its score and loses its name.
                    : "(player left)";

            var seats = Enumerable.Range(0, game.SeatCount).Select(seat => new DuelSeatDTO
            {
                Seat = seat,
                Username = NameOf(seat),
                Score = loaded.State.Scores[seat],
            }).ToList();

            int? winner = null;
            if (game.Match?.WinnerUserId is Guid winnerId)
            {
                winner = game.Players.FirstOrDefault(p => players.TryGetValue(p.SessionId, out var who) && who.UserId == winnerId)?.Seat;
                if (winner is null)
                {
                    // The winner's row is gone: with two Seats, it is the one without a row.
                    var remaining = game.Players.Select(p => p.Seat).ToHashSet();
                    var missing = Enumerable.Range(0, game.SeatCount).Where(s => !remaining.Contains(s)).ToList();
                    winner = missing.Count == 1 ? missing[0] : null;
                }
            }

            return loaded with { DuelSeats = seats, DuelWinner = winner };
        }

        /// <summary>Marks the game and its session finished. <paramref name="at"/> is when it ended — the deadline, for TimeUp.</summary>
        private static void Finish(AssociationGame game, QuizSession session, GameEndReason reason, DateTime at, int score)
        {
            game.EndReason = reason;
            game.EndedAt = at;
            if (!session.IsCompleted)
            {
                session.IsCompleted = true;
                session.EndTime = at;
            }
            session.TotalScore = score;
        }

        private AssociationGameViewDTO Build(Loaded loaded, DateTime now) =>
            AssociationViews.Build(loaded.Session.Id, loaded.Session.QuizId, loaded.Session.Quiz?.Title ?? string.Empty,
                loaded.Game, loaded.Game.Board, loaded.State, loaded.Rules, now,
                mySeat: loaded.Game.Players.First(p => p.SessionId == loaded.Session.Id).Seat,
                seats: loaded.DuelSeats, winnerSeat: loaded.DuelWinner);

        private static AssociationMove ToEngineMove(AssociationGameMove m) =>
            new(m.Seat, m.Kind, m.At, m.TileId, m.Target, m.GuessText);
    }
}
