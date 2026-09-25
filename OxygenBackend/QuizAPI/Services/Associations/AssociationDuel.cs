using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Associations;

namespace QuizAPI.Services.Associations
{
    /// <summary>A Duel move refused — the message is for the player, and nothing was recorded.</summary>
    public sealed class DuelMoveException : Exception
    {
        public DuelMoveException(string message) : base(message) { }
    }

    /// <summary>
    /// One live Duel: two Seats taking turns on one Board (docs/quiz/associations.md §3.3, §10).
    ///
    /// <para><b>Pure.</b> No clock, no SignalR, no database: every call takes the server's "now",
    /// so the whole Duel — the turn clock included — is tested by passing times in. The
    /// <c>AssociationMatchOrchestrator</c> owns the real clock, the hub and the save; this class owns
    /// the rules around the engine: who may act for which Seat, turning a late move away, recording
    /// an expired turn, a forfeit, the winner, and the view.</para>
    ///
    /// <para><b>Not thread-safe.</b> The orchestrator serialises every call on a Duel (hub moves and
    /// its own clock ticks) so that a move and its broadcast can't interleave with another's.</para>
    ///
    /// <para><b>The record is built as it is played.</b> <see cref="Game"/> is the
    /// <see cref="AssociationGame"/> row with its moves and its players, not yet saved: the
    /// orchestrator writes it once, when the Duel ends (ADR 0020 — the move log is the game).</para>
    /// </summary>
    public sealed class AssociationDuel
    {
        private readonly AssociationBoard _board;
        private readonly BoardKey _key;
        private readonly AssociationRules _rules;
        private readonly string[] _usernames;
        private readonly Guid[] _sessionIds;
        private readonly int _quizId;
        private readonly string _quizTitle;
        private int? _forfeitedSeat;

        public AssociationGame Game { get; }
        public AssociationState State { get; private set; }

        public AssociationDuel(
            AssociationBoard board,
            AssociationRules rules,
            IReadOnlyList<string> usernamesBySeat,
            int firstSeat,
            DateTime startedAt,
            int quizId,
            string quizTitle)
        {
            _board = board;
            _key = AssociationBoardMapping.ToKey(board);
            _rules = rules;
            _usernames = usernamesBySeat.ToArray();
            _quizId = quizId;
            _quizTitle = quizTitle;

            State = AssociationEngine.StartDuel(startedAt, _usernames.Length, firstSeat);

            // Each Seat's session id is decided now, so the players' results links can be sent the
            // moment the Duel is recorded; the session rows themselves are written at the end.
            _sessionIds = _usernames.Select(_ => Guid.NewGuid()).ToArray();

            Game = new AssociationGame
            {
                Id = Guid.NewGuid(),
                BoardId = board.Id,
                PlayStyle = PlayStyle.Duel,
                SeatCount = _usernames.Length,
                FirstSeat = firstSeat,
                StartedAt = startedAt,
                DeadlineUtc = null,
                // The snapshot: this Duel is scored by these numbers for good (ADR 0020).
                RulesJson = rules.ToJson(),
            };
            for (var seat = 0; seat < _usernames.Length; seat++)
                Game.Players.Add(new AssociationGamePlayer { GameId = Game.Id, SessionId = _sessionIds[seat], Seat = seat });
        }

        public IReadOnlyList<AssociationGameMove> Moves => Game.Moves.OrderBy(m => m.Seq).ToList();
        public IReadOnlyList<string> Usernames => _usernames;
        public IReadOnlyList<Guid> SessionIds => _sessionIds;
        public bool IsOver => State.IsOver;

        /// <summary>When the current turn's clock runs out.</summary>
        public DateTime TurnDeadline => State.TurnDeadline(_rules);

        /// <summary>
        /// Null while playing, and on a tie. A forfeit is won by the Seat still there whatever the
        /// score (D10); otherwise the higher score wins.
        /// </summary>
        public int? WinnerSeat
        {
            get
            {
                if (!State.IsOver) return null;
                // Two Seats: the other one. (1v1v1 will need its own rule — docs/quiz/associations.md §3.3.)
                if (_forfeitedSeat is int left) return State.SeatCount == 2 ? 1 - left : null;

                var best = State.Scores.Max();
                var leaders = Enumerable.Range(0, State.SeatCount).Where(s => State.Scores[s] == best).ToList();
                return leaders.Count == 1 ? leaders[0] : null;
            }
        }

        public int? SeatOf(string username)
        {
            var index = Array.FindIndex(_usernames, u => string.Equals(u, username, StringComparison.OrdinalIgnoreCase));
            return index < 0 ? null : index;
        }

        // ── Moves ──────────────────────────────────────────────────────────

        public DuelUpdateDTO Open(string username, int tileId, DateTime now) =>
            Play(username, now, seat => AssociationMove.Open(seat, tileId, now));

        public DuelUpdateDTO Guess(string username, string target, string text, DateTime now)
        {
            if (!AssociationMoveInput.TryParseTarget(target, out var parsed))
                throw new DuelMoveException(AssociationMoveInput.BadTarget);
            if (AssociationMoveInput.CheckGuess(text, out var trimmed) is string problem)
                throw new DuelMoveException(problem);

            return Play(username, now, seat => AssociationMove.Guess(seat, parsed, trimmed, now));
        }

        public DuelUpdateDTO Pass(string username, DateTime now) =>
            Play(username, now, seat => AssociationMove.Pass(seat, now));

        private DuelUpdateDTO Play(string username, DateTime now, Func<int, AssociationMove> makeMove)
        {
            if (State.IsOver) throw new DuelMoveException("This duel is over.");
            var seat = SeatOf(username) ?? throw new DuelMoveException("You're not playing in this duel.");

            // A move after the clock ran out is refused by the engine (TurnTimeUp) and recorded as
            // nothing; the orchestrator's next tick records the expiry. The runner never records
            // one on a player's behalf, so the log only says what the clock said.
            var outcome = AssociationEngine.Apply(State, _key, _rules, makeMove(seat));
            if (!outcome.Accepted)
                throw new DuelMoveException(AssociationMoveInput.Describe(outcome.Rejection!.Value));

            return Commit(makeMove(seat), outcome, now);
        }

        /// <summary>
        /// Records <see cref="MoveKind.TurnExpired"/> if the turn clock has run out, and returns the
        /// update to broadcast; null if the turn still has time or the Duel is over.
        /// </summary>
        public DuelUpdateDTO? ExpireTurnIfDue(DateTime now)
        {
            if (State.IsOver || now < TurnDeadline) return null;

            var move = AssociationMove.TurnExpired(State.CurrentSeat, now);
            var outcome = AssociationEngine.Apply(State, _key, _rules, move);
            // The engine accepts TurnExpired exactly when the clock has run out, which was just checked.
            if (!outcome.Accepted)
                throw new InvalidOperationException($"TurnExpired refused at {now:O}: {outcome.Rejection}.");
            return Commit(move, outcome, now);
        }

        /// <summary>
        /// A seated player left: the Duel ends and the other Seat wins (D10). Null — and nothing
        /// changes — for someone who isn't seated, or once the Duel is over.
        /// </summary>
        public DuelUpdateDTO? Forfeit(string username, DateTime now)
        {
            if (State.IsOver || SeatOf(username) is not int seat) return null;

            _forfeitedSeat = seat;
            State = AssociationEngine.End(State, GameEndReason.Forfeit);
            Game.EndReason = GameEndReason.Forfeit;
            Game.EndedAt = now;
            return new DuelUpdateDTO { View = View(now) };
        }

        private DuelUpdateDTO Commit(AssociationMove move, MoveOutcome outcome, DateTime now)
        {
            State = outcome.State;

            var record = new AssociationGameMove
            {
                GameId = Game.Id,
                Seq = State.MoveCount,
                Seat = move.Seat,
                Kind = move.Kind,
                TileId = move.TileId,
                Target = move.Target,
                GuessText = move.GuessText,
                IsCorrect = outcome.IsCorrect,
                Points = outcome.Points,
                At = move.At,
            };
            Game.Moves.Add(record);

            if (outcome.GameEnded is GameEndReason reason)
            {
                Game.EndReason = reason;
                Game.EndedAt = now;
            }

            return new DuelUpdateDTO
            {
                Move = AssociationViews.BuildMove(record),
                IsCorrect = outcome.IsCorrect,
                Points = outcome.Points,
                View = View(now),
            };
        }

        // ── The view ───────────────────────────────────────────────────────

        /// <summary>What both players see. Session ids appear only once it's over.</summary>
        public DuelViewDTO View(DateTime now) =>
            AssociationViews.BuildDuel(_quizId, _quizTitle, Game, _board, State, _rules, _usernames, WinnerSeat, _sessionIds, now);
    }
}
