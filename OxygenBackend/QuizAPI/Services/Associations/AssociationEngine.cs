using System.Collections.Immutable;

namespace QuizAPI.Services.Associations
{
    /// <summary>Why a move was refused. A refused move is an error, never a move: nothing is recorded.</summary>
    public enum MoveRejection
    {
        GameOver,
        /// <summary>The move doesn't exist in this play style (a Pass in Solo, a GiveUp in a Duel).</summary>
        NotInThisStyle,
        UnknownSeat,
        NotYourTurn,
        /// <summary>Duel: a turn starts by opening a Tile; you can't Guess or Pass before that.</summary>
        MustOpenATileFirst,
        /// <summary>Duel: a turn opens exactly one Tile. A correct Guess earns another Guess, not another Tile.</summary>
        AlreadyOpenedThisTurn,
        UnknownTile,
        TileAlreadyOpen,
        TargetAlreadySolved,
        EmptyGuess,
        /// <summary>A required field of the move is missing (a tile id, a target).</summary>
        Malformed,
        /// <summary>Solo: the board timer has run out. The caller ends the game as <see cref="GameEndReason.TimeUp"/>.</summary>
        BoardTimeUp,
        /// <summary>Duel: the turn clock has run out. The server records <see cref="MoveKind.TurnExpired"/> instead.</summary>
        TurnTimeUp,
        /// <summary>Duel: a <see cref="MoveKind.TurnExpired"/> arrived before the turn clock ran out.</summary>
        TurnNotOver,
    }

    /// <summary>What applying one move did — enough for the caller to announce it and persist it.</summary>
    public sealed record MoveOutcome
    {
        public required AssociationState State { get; init; }
        public MoveRejection? Rejection { get; init; }
        public bool Accepted => Rejection is null;

        /// <summary>Tiles that became open: the one opened, or a solved Column's remaining Tiles.</summary>
        public ImmutableArray<int> OpenedTiles { get; init; } = ImmutableArray<int>.Empty;

        /// <summary>For a Guess: whether it was right. Null for any other move.</summary>
        public bool? IsCorrect { get; init; }

        /// <summary>Points the move earned (for a Final, including the Columns it collected).</summary>
        public int Points { get; init; }

        /// <summary>Columns solved by this move — one for a Column Guess, the collected ones for the Final.</summary>
        public ImmutableArray<ColumnLetter> SolvedColumns { get; init; } = ImmutableArray<ColumnLetter>.Empty;

        public bool FinalSolved { get; init; }

        /// <summary>Duel: the turn moved to another Seat (see <see cref="AssociationState.CurrentSeat"/>).</summary>
        public bool TurnPassed { get; init; }

        /// <summary>Duel: this move started the endgame.</summary>
        public bool EndgameStarted { get; init; }

        /// <summary>Set when this move ended the game.</summary>
        public GameEndReason? GameEnded { get; init; }

        internal static MoveOutcome Reject(AssociationState state, MoveRejection why) => new() { State = state, Rejection = why };
    }

    /// <summary>
    /// The rules of Associations, and the only place they live.
    ///
    /// <para><b>Pure.</b> No EF, no SignalR, no HTTP, no clock: the caller passes the board, the
    /// game's <see cref="AssociationRules"/> snapshot and each move's server timestamp. Solo play,
    /// the Duel orchestrator, resume and the results review all go through
    /// <see cref="Apply"/> (and <see cref="Replay"/>), so none of them can disagree about whether a
    /// move was legal or what it scored.</para>
    ///
    /// <para><b>The Duel turn</b> (docs/quiz/associations.md): open exactly one closed Tile, then
    /// optionally Guess any unsolved Column or the Final. A correct Guess scores and earns another
    /// Guess — not another Tile — and restarts the turn clock. A wrong Guess, a Pass or the clock
    /// running out passes the turn. Once every Tile is open the endgame begins: each Seat gets
    /// <see cref="AssociationRules.EndgameTurnsPerSeat"/> guess-only turns, then the game ends. Turn
    /// order is <c>(seat + 1) % seatCount</c>, never "the other player", so more than two Seats
    /// work unchanged.</para>
    ///
    /// <para><b>Solo</b> (D18, 2026-09-24): one Seat against the board timer. Opening a Tile earns
    /// one Guess at any unsolved target; a correct Guess earns another, a wrong one means the next
    /// Guess needs another Tile. Opening a Tile without guessing is allowed (the earned Guess is
    /// simply not used). Once no Tile is closed, a wrong Guess counts down the same endgame a Duel
    /// has — <see cref="AssociationRules.EndgameTurnsPerSeat"/> more tries — then the game ends.
    /// Wrong Guesses cost no points.</para>
    /// </summary>
    public static class AssociationEngine
    {
        private const int TileCount = BoardKey.ColumnCount * BoardKey.TilesPerColumn;

        // ── Starting ────────────────────────────────────────────────────────

        public static AssociationState StartSolo(DateTime startedAt, int boardSeconds)
        {
            if (boardSeconds <= 0) throw new ArgumentOutOfRangeException(nameof(boardSeconds));

            return new AssociationState
            {
                Style = PlayStyle.Solo,
                SeatCount = 1,
                StartedAt = startedAt,
                Deadline = startedAt.AddSeconds(boardSeconds),
                Scores = ImmutableArray.Create(0),
                CurrentSeat = 0,
                // Solo starts like a Duel turn: open a Tile first (D18).
                Phase = TurnPhase.MustOpen,
                TurnStartedAt = startedAt,
            };
        }

        /// <param name="firstSeat">Who opens first. Chosen by the caller (at random; a rematch alternates) so the engine stays deterministic.</param>
        /// <summary>
        /// Host mode (docs/quiz/classroom.md): the Duel's turns for 2–4 Teams, one Seat each. No
        /// clock is enforced by the engine — see <see cref="PlayStyle.Hosted"/>.
        /// </summary>
        public static AssociationState StartHosted(DateTime startedAt, int seatCount, int firstSeat)
        {
            if (seatCount is < MinHostedSeats or > MaxHostedSeats)
                throw new ArgumentOutOfRangeException(nameof(seatCount), $"A hosted game has {MinHostedSeats}–{MaxHostedSeats} teams.");
            return StartDuel(startedAt, seatCount, firstSeat) with { Style = PlayStyle.Hosted };
        }

        public const int MinHostedSeats = 2;
        public const int MaxHostedSeats = 4;

        public static AssociationState StartDuel(DateTime startedAt, int seatCount, int firstSeat)
        {
            if (seatCount < 2) throw new ArgumentOutOfRangeException(nameof(seatCount), "A duel needs at least two seats.");
            if (firstSeat < 0 || firstSeat >= seatCount) throw new ArgumentOutOfRangeException(nameof(firstSeat));

            return new AssociationState
            {
                Style = PlayStyle.Duel,
                SeatCount = seatCount,
                StartedAt = startedAt,
                Deadline = null,
                Scores = ImmutableArray.CreateRange(new int[seatCount]),
                CurrentSeat = firstSeat,
                Phase = TurnPhase.MustOpen,
                TurnStartedAt = startedAt,
            };
        }

        // ── Moves ───────────────────────────────────────────────────────────

        public static MoveOutcome Apply(AssociationState state, BoardKey board, AssociationRules rules, AssociationMove move)
        {
            if (state.IsOver) return MoveOutcome.Reject(state, MoveRejection.GameOver);
            if (move.Seat < 0 || move.Seat >= state.SeatCount) return MoveOutcome.Reject(state, MoveRejection.UnknownSeat);
            // An Undo is resolved by Replay, never applied as a move of its own (ADR 0025).
            if (move.Kind == MoveKind.Undo) return MoveOutcome.Reject(state, MoveRejection.NotInThisStyle);

            return state.Style == PlayStyle.Solo
                ? ApplySolo(state, board, rules, move)
                : ApplyDuel(state, board, rules, move);
        }

        private static MoveOutcome ApplySolo(AssociationState state, BoardKey board, AssociationRules rules, AssociationMove move)
        {
            if (move.At >= state.Deadline) return MoveOutcome.Reject(state, MoveRejection.BoardTimeUp);

            switch (move.Kind)
            {
                case MoveKind.OpenTile:
                {
                    // Any closed Tile, at any time — including instead of using the Guess the last
                    // Tile earned (skipping it). Opening is what earns the next Guess.
                    var opened = OpenTile(state, board, move);
                    if (!opened.Accepted) return opened;
                    return opened with { State = opened.State with { Phase = TurnPhase.MayGuess } };
                }

                case MoveKind.Guess:
                {
                    if (state.Phase != TurnPhase.MayGuess) return MoveOutcome.Reject(state, MoveRejection.MustOpenATileFirst);
                    var guess = Guess(state, board, rules, move);
                    if (!guess.Accepted || guess.GameEnded is not null || guess.IsCorrect == true) return guess;

                    // Wrong: the Guess is spent, and the next one needs another Tile — or, with no
                    // closed Tile left, it counts down the endgame. Same bookkeeping as a Duel turn
                    // passing, with one Seat, so the endgame rule is written once.
                    var passed = PassTurn(guess.State, rules, move.At, guess);
                    return passed with { TurnPassed = false };
                }

                case MoveKind.GiveUp:
                    return Committed(state, move) with { GameEnded = GameEndReason.GaveUp, State = Next(state) with { EndReason = GameEndReason.GaveUp } };

                default:
                    return MoveOutcome.Reject(state, MoveRejection.NotInThisStyle);
            }
        }

        private static MoveOutcome ApplyDuel(AssociationState state, BoardKey board, AssociationRules rules, AssociationMove move)
        {
            if (move.Kind == MoveKind.GiveUp) return MoveOutcome.Reject(state, MoveRejection.NotInThisStyle);
            if (move.Seat != state.CurrentSeat) return MoveOutcome.Reject(state, MoveRejection.NotYourTurn);

            // A Duel's turn clock is part of its rules. Host mode's clocks can be paused, so the
            // service keeps them and decides when a turn has run out; the engine trusts it.
            var clocked = state.Style == PlayStyle.Duel;
            var deadline = state.TurnDeadline(rules);

            if (move.Kind == MoveKind.TurnExpired)
            {
                if (clocked && move.At < deadline) return MoveOutcome.Reject(state, MoveRejection.TurnNotOver);
                return PassTurn(Next(state), rules, move.At, Committed(state, move));
            }

            if (clocked && move.At > deadline) return MoveOutcome.Reject(state, MoveRejection.TurnTimeUp);

            switch (move.Kind)
            {
                case MoveKind.OpenTile:
                {
                    if (state.Phase != TurnPhase.MustOpen) return MoveOutcome.Reject(state, MoveRejection.AlreadyOpenedThisTurn);
                    var opened = OpenTile(state, board, move);
                    if (!opened.Accepted) return opened;
                    return opened with { State = opened.State with { Phase = TurnPhase.MayGuess } };
                }

                case MoveKind.Guess:
                {
                    if (state.Phase != TurnPhase.MayGuess) return MoveOutcome.Reject(state, MoveRejection.MustOpenATileFirst);
                    var guess = Guess(state, board, rules, move);
                    if (!guess.Accepted || guess.GameEnded is not null) return guess;

                    return guess.IsCorrect == true
                        // Correct: keep the turn, may Guess again (not open), and the clock restarts.
                        ? guess with { State = guess.State with { TurnStartedAt = move.At } }
                        // Wrong: the turn passes.
                        : PassTurn(guess.State, rules, move.At, guess);
                }

                case MoveKind.Pass:
                {
                    if (state.Phase != TurnPhase.MayGuess) return MoveOutcome.Reject(state, MoveRejection.MustOpenATileFirst);
                    return PassTurn(Next(state), rules, move.At, Committed(state, move));
                }

                default:
                    return MoveOutcome.Reject(state, MoveRejection.NotInThisStyle);
            }
        }

        private static MoveOutcome OpenTile(AssociationState state, BoardKey board, AssociationMove move)
        {
            if (move.TileId is not int tileId) return MoveOutcome.Reject(state, MoveRejection.Malformed);
            if (!board.TryGetColumnOf(tileId, out _)) return MoveOutcome.Reject(state, MoveRejection.UnknownTile);
            if (state.OpenTiles.Contains(tileId)) return MoveOutcome.Reject(state, MoveRejection.TileAlreadyOpen);

            return new MoveOutcome
            {
                State = Next(state) with { OpenTiles = state.OpenTiles.Add(tileId) },
                OpenedTiles = ImmutableArray.Create(tileId),
            };
        }

        private static MoveOutcome Guess(AssociationState state, BoardKey board, AssociationRules rules, AssociationMove move)
        {
            if (move.Target is not GuessTarget target) return MoveOutcome.Reject(state, MoveRejection.Malformed);
            if (string.IsNullOrWhiteSpace(move.GuessText)) return MoveOutcome.Reject(state, MoveRejection.EmptyGuess);

            if (target == GuessTarget.Final)
            {
                if (state.IsFinalSolved) return MoveOutcome.Reject(state, MoveRejection.TargetAlreadySolved);

                if (!AssociationGuessMatcher.IsMatch(board.Final, move.GuessText))
                    return new MoveOutcome { State = Next(state), IsCorrect = false };

                // The Final collects every Column still unsolved, each at its value right now.
                var state2 = Next(state);
                var collected = ImmutableArray.CreateBuilder<ColumnLetter>();
                var opened = ImmutableArray.CreateBuilder<int>();
                var collectedValues = new List<int>();
                foreach (var column in board.Columns)
                {
                    if (state2.IsColumnSolved(column.Letter)) continue;
                    var value = AssociationScoring.ColumnValue(rules, ClosedTiles(state2, column));
                    collectedValues.Add(value);
                    collected.Add(column.Letter);
                    opened.AddRange(column.TileIds.Where(id => !state2.OpenTiles.Contains(id)));
                    state2 = state2 with
                    {
                        SolvedColumns = state2.SolvedColumns.Add(column.Letter, new ColumnSolve(move.Seat, value, ViaFinal: true)),
                        OpenTiles = state2.OpenTiles.Union(column.TileIds),
                    };
                }

                // FinalPoints is the whole award, collected Columns included; the Columns' own
                // ColumnSolve.Points say how that total breaks down and are NOT added again.
                var points = AssociationScoring.FinalValue(rules, collectedValues);
                state2 = state2 with
                {
                    FinalSolvedBy = move.Seat,
                    FinalPoints = points,
                    Scores = state2.Scores.SetItem(move.Seat, state2.Scores[move.Seat] + points),
                    EndReason = GameEndReason.FinalSolved,
                };

                return new MoveOutcome
                {
                    State = state2,
                    IsCorrect = true,
                    Points = points,
                    SolvedColumns = collected.ToImmutable(),
                    OpenedTiles = opened.ToImmutable(),
                    FinalSolved = true,
                    GameEnded = GameEndReason.FinalSolved,
                };
            }

            var letter = (ColumnLetter)(int)target;
            if (state.IsColumnSolved(letter)) return MoveOutcome.Reject(state, MoveRejection.TargetAlreadySolved);

            var key = board.Column(letter);
            if (!AssociationGuessMatcher.IsMatch(key.Solution, move.GuessText))
                return new MoveOutcome { State = Next(state), IsCorrect = false };

            var columnValue = AssociationScoring.ColumnValue(rules, ClosedTiles(state, key));
            var newlyOpen = key.TileIds.Where(id => !state.OpenTiles.Contains(id)).ToImmutableArray();
            var solved = Next(state) with
            {
                SolvedColumns = state.SolvedColumns.Add(letter, new ColumnSolve(move.Seat, columnValue, ViaFinal: false)),
                OpenTiles = state.OpenTiles.Union(key.TileIds),
                Scores = state.Scores.SetItem(move.Seat, state.Scores[move.Seat] + columnValue),
            };

            return new MoveOutcome
            {
                State = solved,
                IsCorrect = true,
                Points = columnValue,
                SolvedColumns = ImmutableArray.Create(letter),
                OpenedTiles = newlyOpen,
            };
        }

        /// <summary>
        /// Hands the turn to the next Seat, entering or advancing the endgame when no closed Tile is
        /// left. <paramref name="state"/> already has the move counted.
        /// </summary>
        private static MoveOutcome PassTurn(AssociationState state, AssociationRules rules, DateTime at, MoveOutcome outcome)
        {
            var next = (state.CurrentSeat + 1) % state.SeatCount;
            var anyClosed = state.OpenTiles.Count < TileCount;

            if (anyClosed)
            {
                return outcome with
                {
                    State = state with { CurrentSeat = next, Phase = TurnPhase.MustOpen, TurnStartedAt = at },
                    TurnPassed = true,
                };
            }

            // Endgame: every turn from here is guesses only, and each Seat gets a fixed number.
            // The count is fixed — a correct Guess doesn't earn more turns — so a Duel always ends.
            var startedNow = !state.InEndgame;
            var taken = startedNow ? ImmutableArray.CreateRange(new int[state.SeatCount]) : state.EndgameTurnsTaken;

            if (taken[next] >= rules.EndgameTurnsPerSeat)
            {
                return outcome with
                {
                    State = state with { EndgameTurnsTaken = taken, EndReason = GameEndReason.EndgameOver },
                    TurnPassed = false,
                    EndgameStarted = startedNow,
                    GameEnded = GameEndReason.EndgameOver,
                };
            }

            return outcome with
            {
                State = state with
                {
                    CurrentSeat = next,
                    Phase = TurnPhase.MayGuess,
                    TurnStartedAt = at,
                    EndgameTurnsTaken = taken.SetItem(next, taken[next] + 1),
                },
                TurnPassed = true,
                EndgameStarted = startedNow,
            };
        }

        // ── Server-decided endings ──────────────────────────────────────────

        /// <summary>
        /// Ends a game for a reason no move expresses: the Solo board timer ran out, a Duel player
        /// left, or the game was abandoned. Moves can't do this — it is the server's call — so the
        /// reason is stored on the game and <see cref="Replay"/> reapplies it.
        /// </summary>
        public static AssociationState End(AssociationState state, GameEndReason reason)
        {
            if (reason is GameEndReason.FinalSolved or GameEndReason.EndgameOver or GameEndReason.GaveUp)
                throw new ArgumentException($"{reason} is reached by a move, not ended from outside.", nameof(reason));
            return state.IsOver ? state : state with { EndReason = reason };
        }

        // ── Replay ──────────────────────────────────────────────────────────

        /// <summary>
        /// Rebuilds a game from its start and its move log — how resume, the results review and the
        /// Duel timeline all get their state. Pass the game's <i>snapshot</i> rules, never the
        /// current configuration. A log that contains a move the engine refuses is corrupt, and
        /// throws rather than skipping it.
        /// </summary>
        public static AssociationState Replay(
            AssociationState start,
            BoardKey board,
            AssociationRules rules,
            IEnumerable<AssociationMove> moves,
            GameEndReason? serverEndReason = null)
        {
            var log = moves.ToList();

            // Undo (ADR 0025): an Undo names the 1-based position of the move it cancels. Both are
            // skipped, so the state is as if the cancelled move had never been made.
            var cancelled = new HashSet<int>();
            for (var i = 0; i < log.Count; i++)
            {
                if (log[i].Kind != MoveKind.Undo) continue;
                if (log[i].Cancels is not int target || target < 1 || target > i || log[target - 1].Kind == MoveKind.Undo || !cancelled.Add(target))
                    throw new InvalidOperationException($"Move {i + 1} is an Undo of nothing that can be undone.");
            }

            var state = start;
            var index = 0;
            foreach (var move in log)
            {
                index++;
                if (move.Kind == MoveKind.Undo || cancelled.Contains(index)) continue;
                var outcome = Apply(state, board, rules, move);
                if (!outcome.Accepted)
                    throw new InvalidOperationException($"Move {index} ({move.Kind} by seat {move.Seat}) is not legal: {outcome.Rejection}.");
                state = outcome.State;
            }

            if (serverEndReason is GameEndReason reason && !state.IsOver)
                state = End(state, reason);

            return state;
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private static int ClosedTiles(AssociationState state, ColumnKey column) =>
            column.TileIds.Count(id => !state.OpenTiles.Contains(id));

        /// <summary>The state with this move counted.</summary>
        private static AssociationState Next(AssociationState state) => state with { MoveCount = state.MoveCount + 1 };

        private static MoveOutcome Committed(AssociationState state, AssociationMove move) => new() { State = Next(state) };
    }
}
