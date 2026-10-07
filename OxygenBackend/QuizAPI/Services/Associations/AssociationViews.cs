using System.Text.Json;
using QuizAPI.DTOs.Classroom;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Associations;

namespace QuizAPI.Services.Associations
{
    /// <summary>
    /// The one place a client's view of a game is made (docs/quiz/associations.md, "What the client
    /// sees"). The Board's whole value is in what is hidden, and anything that reaches the browser
    /// is not hidden, so:
    /// <list type="bullet">
    /// <item>a closed Tile has no text;</item>
    /// <item>an unsolved Column or Final has no solution;</item>
    /// <item>acceptable spellings are never sent, not even after the game;</item>
    /// <item>the whole Board is revealed only once the game is over.</item>
    /// </list>
    /// Pinned by <c>AssociationViewSecrecyTests</c>, which serialise views and search the JSON.
    /// </summary>
    public static class AssociationViews
    {
        private static readonly string[] Letters = { "A", "B", "C", "D" };

        /// <param name="board">The Board the game is played on — passed rather than read from
        /// <c>game.Board</c>, so a caller never has to attach a Board to a new game to build its view.</param>
        public static AssociationGameViewDTO Build(
            Guid sessionId,
            int quizId,
            string quizTitle,
            AssociationGame game,
            AssociationBoard board,
            AssociationState state,
            AssociationRules rules,
            DateTime now,
            int mySeat = 0,
            List<DuelSeatDTO>? seats = null,
            int? winnerSeat = null)
        {
            var over = state.IsOver;
            var tileCount = board.Columns.Sum(c => c.Tiles.Count);

            return new AssociationGameViewDTO
            {
                SessionId = sessionId,
                QuizId = quizId,
                QuizTitle = quizTitle,
                PlayStyle = state.Style.ToString(),
                IsOver = over,
                EndReason = state.EndReason?.ToString(),
                StartedAt = game.StartedAt,
                EndedAt = game.EndedAt,
                DeadlineUtc = game.DeadlineUtc,
                ServerNow = now,
                BoardSeconds = game.DeadlineUtc is DateTime deadline
                    ? (int)Math.Round((deadline - game.StartedAt).TotalSeconds)
                    : 0,
                Score = state.Scores.IsDefaultOrEmpty ? 0 : state.Scores[mySeat],
                MySeat = mySeat,
                Seats = seats ?? new List<DuelSeatDTO>(),
                WinnerSeat = over ? winnerSeat : null,
                // What the player may do next — the engine's phase, said plainly so the screen never
                // has to re-derive a rule (docs/quiz/associations.md §3.2).
                CanOpen = !over && state.OpenTiles.Count < tileCount,
                CanGuess = !over && state.Phase == TurnPhase.MayGuess,
                InEndgame = !over && state.InEndgame,
                EndgameTriesLeft = !over && state.InEndgame
                    ? Math.Max(0, rules.EndgameTurnsPerSeat - state.EndgameTurnsTaken[state.CurrentSeat] + 1)
                    : null,
                Columns = BuildColumns(game, board, state),
                Final = BuildFinal(board, state),
                Moves = game.Moves.OrderBy(m => m.Seq).Select(BuildMove).ToList(),
            };
        }

        /// <summary>
        /// A Duel's view — the same for both players, since nothing in a Duel is private to one Seat
        /// (D15: even wrong Guesses are shown). <paramref name="winnerSeat"/> is the caller's, because a
        /// forfeit decides it and replay can't.
        /// </summary>
        public static DuelViewDTO BuildDuel(
            int quizId,
            string quizTitle,
            AssociationGame game,
            AssociationBoard board,
            AssociationState state,
            AssociationRules rules,
            IReadOnlyList<string> usernamesBySeat,
            int? winnerSeat,
            IReadOnlyList<Guid>? sessionIdsBySeat,
            DateTime now)
        {
            var over = state.IsOver;
            var tileCount = board.Columns.Sum(c => c.Tiles.Count);
            var mayGuess = !over && state.Phase == TurnPhase.MayGuess;

            return new DuelViewDTO
            {
                QuizId = quizId,
                QuizTitle = quizTitle,
                FirstSeat = game.FirstSeat,
                Seats = Enumerable.Range(0, state.SeatCount).Select(seat => new DuelSeatDTO
                {
                    Seat = seat,
                    Username = seat < usernamesBySeat.Count ? usernamesBySeat[seat] : string.Empty,
                    Score = state.Scores[seat],
                    EndgameTurnsLeft = !over && state.InEndgame
                        ? Math.Max(0, rules.EndgameTurnsPerSeat - state.EndgameTurnsTaken[seat])
                        : null,
                    SessionId = over && sessionIdsBySeat is not null && seat < sessionIdsBySeat.Count
                        ? sessionIdsBySeat[seat]
                        : null,
                }).ToList(),
                CurrentSeat = over ? null : state.CurrentSeat,
                TurnDeadlineUtc = over ? null : state.TurnDeadline(rules),
                ServerNow = now,
                TurnSeconds = rules.DuelTurnSeconds,
                CanOpen = !over && state.Phase == TurnPhase.MustOpen && state.OpenTiles.Count < tileCount,
                CanGuess = mayGuess,
                CanPass = mayGuess,
                InEndgame = !over && state.InEndgame,
                IsOver = over,
                EndReason = state.EndReason?.ToString(),
                WinnerSeat = over ? winnerSeat : null,
                Columns = BuildColumns(game, board, state),
                Final = BuildFinal(board, state),
                Moves = game.Moves.OrderBy(m => m.Seq).Select(BuildMove).ToList(),
            };
        }

        /// <summary>
        /// A hosted game (docs/quiz/classroom.md). <paramref name="forController"/> adds what only
        /// the Teacher's own device may carry — the Screen code, the Undo label, and the Answer key
        /// while a Display is connected. A Display's view is built with it false and is exactly as
        /// secret as a player's (ADR 0024, pinned by HostedViewSecrecyTests).
        /// </summary>
        public static HostedGameViewDTO BuildHosted(
            AssociationGame game,
            AssociationBoard board,
            AssociationState state,
            AssociationRules rules,
            DateTime now,
            bool forController,
            int displaysConnected,
            string? undoLabel)
        {
            var over = state.IsOver;
            var tileCount = board.Columns.Sum(c => c.Tiles.Count);
            var paused = !over && game.PausedAt is not null;
            var mayGuess = !over && !paused && state.Phase == TurnPhase.MayGuess;
            var timed = game.GameSeconds is not null;

            int? Left(DateTime? deadline) =>
                deadline is DateTime d && game.PausedAt is DateTime p ? Math.Max(0, (int)Math.Ceiling((d - p).TotalSeconds)) : null;

            var view = new HostedGameViewDTO
            {
                Id = game.Id,
                QuizId = board.QuizId,
                FirstSeat = game.FirstSeat,
                Teams = game.Teams.OrderBy(t => t.Seat).Select(t => new HostedTeamDTO
                {
                    Seat = t.Seat,
                    Name = t.Name,
                    Colour = t.Colour,
                    Students = JsonSerializer.Deserialize<List<string>>(t.StudentsJson) ?? new(),
                    Score = t.Seat < state.Scores.Length ? state.Scores[t.Seat] : 0,
                    EndgameTurnsLeft = !over && state.InEndgame
                        ? Math.Max(0, rules.EndgameTurnsPerSeat - state.EndgameTurnsTaken[t.Seat])
                        : null,
                }).ToList(),
                CurrentSeat = over ? null : state.CurrentSeat,
                CanOpen = !over && !paused && state.Phase == TurnPhase.MustOpen && state.OpenTiles.Count < tileCount,
                CanGuess = mayGuess,
                CanPass = mayGuess,
                InEndgame = !over && state.InEndgame,
                IsOver = over,
                EndReason = state.EndReason?.ToString(),
                Timed = timed,
                GameSeconds = game.GameSeconds,
                TurnSeconds = game.TurnSeconds,
                GameDeadlineUtc = over || paused ? null : game.GameDeadlineUtc,
                TurnDeadlineUtc = over || paused ? null : game.TurnDeadlineUtc,
                IsPaused = paused,
                GameSecondsLeft = paused && !game.LastRound ? Left(game.GameDeadlineUtc) : null,
                TurnSecondsLeft = paused ? Left(game.TurnDeadlineUtc) : null,
                LastRound = !over && game.LastRound,
                ServerNow = now,
                Columns = BuildColumns(game, board, state),
                Final = BuildFinal(board, state),
                Moves = game.Moves.OrderBy(m => m.Seq).Select(BuildMove).ToList(),
            };

            if (forController)
            {
                view.UndoLabel = undoLabel;
                view.ScreenCode = over ? null : game.ScreenCode;
                view.DisplaysConnected = displaysConnected;
                // Only with a Display connected: then the Controller isn't the projected screen (C8).
                if (displaysConnected > 0)
                {
                    view.AnswerKey = board.Columns.OrderBy(c => c.Position)
                        .Select(c => new AnswerKeyEntryDTO { Target = Letters[c.Position], Solution = c.Solution })
                        .Append(new AnswerKeyEntryDTO { Target = "Final", Solution = board.FinalSolution })
                        .ToList();
                }
            }
            return view;
        }

        // ── The pieces both views share: what is hidden is decided here and only here ──

        private static List<AssociationColumnViewDTO> BuildColumns(AssociationGame game, AssociationBoard board, AssociationState state)
        {
            var over = state.IsOver;

            // Who opened a Tile by hand. Tiles a solve revealed have no opener; a move a later Undo
            // cancelled (Host mode, ADR 0025) opened nothing.
            var cancelled = game.Moves.Where(m => m.Kind == MoveKind.Undo && m.CancelsSeq is not null)
                .Select(m => m.CancelsSeq!.Value).ToHashSet();
            var openedBy = game.Moves
                .Where(m => m.Kind == MoveKind.OpenTile && m.TileId is not null && !cancelled.Contains(m.Seq))
                .GroupBy(m => m.TileId!.Value)
                .ToDictionary(g => g.Key, g => g.First().Seat);

            return board.Columns.OrderBy(c => c.Position).Select(column =>
            {
                var letter = (ColumnLetter)column.Position;
                state.SolvedColumns.TryGetValue(letter, out var solve);

                return new AssociationColumnViewDTO
                {
                    Letter = Letters[column.Position],
                    Solved = solve is not null,
                    Solution = solve is not null || over ? column.Solution : null,
                    Points = solve?.Points,
                    SolvedBySeat = solve?.Seat,
                    ViaFinal = solve?.ViaFinal ?? false,
                    Tiles = column.Tiles.OrderBy(t => t.Position).Select(tile =>
                    {
                        var open = state.OpenTiles.Contains(tile.Id);
                        return new AssociationTileViewDTO
                        {
                            Id = tile.Id,
                            Position = tile.Position,
                            IsOpen = open,
                            Text = open || over ? tile.Text : null,
                            OpenedBySeat = open && openedBy.TryGetValue(tile.Id, out var seat) ? seat : null,
                        };
                    }).ToList(),
                };
            }).ToList();
        }

        private static AssociationFinalViewDTO BuildFinal(AssociationBoard board, AssociationState state) => new()
        {
            Solved = state.IsFinalSolved,
            Solution = state.IsFinalSolved || state.IsOver ? board.FinalSolution : null,
            Points = state.IsFinalSolved ? state.FinalPoints : null,
            SolvedBySeat = state.FinalSolvedBy,
        };

        internal static AssociationMoveViewDTO BuildMove(AssociationGameMove m) => new()
        {
            Seq = m.Seq,
            Seat = m.Seat,
            Kind = m.Kind.ToString(),
            TileId = m.TileId,
            Target = m.Target?.ToString(),
            GuessText = m.GuessText,
            IsCorrect = m.IsCorrect,
            Points = m.Points,
            At = m.At,
            CancelsSeq = m.CancelsSeq,
        };
    }
}
