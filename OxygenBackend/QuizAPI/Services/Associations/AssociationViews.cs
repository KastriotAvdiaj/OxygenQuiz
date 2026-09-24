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
            DateTime now)
        {
            var over = state.IsOver;
            var tileCount = board.Columns.Sum(c => c.Tiles.Count);

            // Who opened a Tile by hand. Tiles a solve revealed have no opener.
            var openedBy = game.Moves
                .Where(m => m.Kind == MoveKind.OpenTile && m.TileId is not null)
                .GroupBy(m => m.TileId!.Value)
                .ToDictionary(g => g.Key, g => g.First().Seat);

            var columns = board.Columns.OrderBy(c => c.Position).Select(column =>
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
                Score = state.Scores.IsDefaultOrEmpty ? 0 : state.Scores[0],
                // What the player may do next — the engine's phase, said plainly so the screen never
                // has to re-derive a rule (docs/quiz/associations.md §3.2).
                CanOpen = !over && state.OpenTiles.Count < tileCount,
                CanGuess = !over && state.Phase == TurnPhase.MayGuess,
                InEndgame = !over && state.InEndgame,
                EndgameTriesLeft = !over && state.InEndgame
                    ? Math.Max(0, rules.EndgameTurnsPerSeat - state.EndgameTurnsTaken[state.CurrentSeat] + 1)
                    : null,
                Columns = columns,
                Final = new AssociationFinalViewDTO
                {
                    Solved = state.IsFinalSolved,
                    Solution = state.IsFinalSolved || over ? board.FinalSolution : null,
                    Points = state.IsFinalSolved ? state.FinalPoints : null,
                    SolvedBySeat = state.FinalSolvedBy,
                },
                Moves = game.Moves.OrderBy(m => m.Seq).Select(m => new AssociationMoveViewDTO
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
                }).ToList(),
            };
        }
    }
}
