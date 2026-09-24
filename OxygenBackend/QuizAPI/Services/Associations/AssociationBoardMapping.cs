using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Associations;

namespace QuizAPI.Services.Associations
{
    /// <summary>Between the Board entities, the authoring DTOs and the engine's <see cref="BoardKey"/>.</summary>
    public static class AssociationBoardMapping
    {
        private static readonly string[] Letters = { "A", "B", "C", "D" };

        /// <summary>A new Board entity from validated, cleaned input.</summary>
        public static AssociationBoard ToEntity(AssociationBoardInput clean, int quizId, int createdInVersion) => new()
        {
            QuizId = quizId,
            CreatedInVersion = createdInVersion,
            FinalSolution = clean.FinalSolution,
            FinalAcceptableSolutions = clean.FinalAcceptableSolutions.ToList(),
            Columns = clean.Columns.Select((column, c) => new AssociationColumn
            {
                Position = c,
                Solution = column.Solution,
                AcceptableSolutions = column.AcceptableSolutions.ToList(),
                Tiles = column.Tiles.Select((text, t) => new AssociationTile { Position = t, Text = text }).ToList(),
            }).ToList(),
        };

        /// <summary>The builder's full read — the answer key, so owner/admin only (the service decides).</summary>
        public static AssociationBoardDTO ToEditDto(AssociationBoard board, int quizVersion, int boardSeconds) => new()
        {
            QuizId = board.QuizId,
            Version = quizVersion,
            BoardTimeInSeconds = boardSeconds,
            FinalSolution = board.FinalSolution,
            FinalAcceptableSolutions = board.FinalAcceptableSolutions.ToList(),
            Columns = board.Columns.OrderBy(c => c.Position).Select(c => new AssociationColumnDTO
            {
                Letter = Letters[c.Position],
                Solution = c.Solution,
                AcceptableSolutions = c.AcceptableSolutions.ToList(),
                Tiles = c.Tiles.OrderBy(t => t.Position)
                    .Select(t => new AssociationTileDTO { Id = t.Id, Position = t.Position, Text = t.Text })
                    .ToList(),
            }).ToList(),
        };

        /// <summary>The engine's view of a stored Board: Tile ids per Column, and the solutions. No Tile text.</summary>
        public static BoardKey ToKey(AssociationBoard board)
        {
            var columns = board.Columns.OrderBy(c => c.Position).Select(c => new ColumnKey(
                (ColumnLetter)c.Position,
                c.Tiles.OrderBy(t => t.Position).Select(t => t.Id).ToList(),
                new SolutionKey(c.Solution, c.AcceptableSolutions.ToList()))).ToList();
            return new BoardKey(columns, new SolutionKey(board.FinalSolution, board.FinalAcceptableSolutions.ToList()));
        }

        /// <summary>
        /// True when a stored Board already holds exactly this (cleaned) content — so a save that
        /// only changed the title doesn't copy the Board into a new version.
        /// </summary>
        public static bool HasSameContent(AssociationBoard board, AssociationBoardInput clean)
        {
            if (board.FinalSolution != clean.FinalSolution) return false;
            if (!board.FinalAcceptableSolutions.SequenceEqual(clean.FinalAcceptableSolutions)) return false;

            var columns = board.Columns.OrderBy(c => c.Position).ToList();
            if (columns.Count != clean.Columns.Count) return false;
            for (var i = 0; i < columns.Count; i++)
            {
                var stored = columns[i];
                var incoming = clean.Columns[i];
                if (stored.Solution != incoming.Solution) return false;
                if (!stored.AcceptableSolutions.SequenceEqual(incoming.AcceptableSolutions)) return false;
                if (!stored.Tiles.OrderBy(t => t.Position).Select(t => t.Text).SequenceEqual(incoming.Tiles)) return false;
            }
            return true;
        }
    }
}
