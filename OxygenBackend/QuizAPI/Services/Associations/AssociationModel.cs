using System.Collections.Immutable;

namespace QuizAPI.Services.Associations
{
    // The engine's own vocabulary. Deliberately free of EF entities: the engine is pure, so it takes
    // a board description and a list of moves, and the persistence layer maps to and from these.
    // Terms follow docs/quiz/glossary.md (Board, Column, Tile, Column solution, Final solution, Guess).

    /// <summary>A Column's letter. Position 0–3 on the board.</summary>
    public enum ColumnLetter { A = 0, B = 1, C = 2, D = 3 }

    /// <summary>What a Guess is aimed at. A Guess is checked only against its target.</summary>
    public enum GuessTarget { A = 0, B = 1, C = 2, D = 3, Final = 4 }

    /// <summary>How the game is played. Named to avoid "mode", which <c>QuizSessionMode</c> already means.</summary>
    public enum PlayStyle
    {
        Solo = 0,
        Duel = 1,
        /// <summary>
        /// Host mode: a Teacher plays for 2–4 Teams on one screen, under the Duel's turn rules
        /// (docs/quiz/classroom.md, ADR 0023). The engine enforces no clock here — the service
        /// owns pausable clocks and records <see cref="MoveKind.TurnExpired"/> itself.
        /// </summary>
        Hosted = 2,
    }

    public enum MoveKind
    {
        OpenTile = 0,
        Guess = 1,
        /// <summary>Duel: end your turn without (another) Guess.</summary>
        Pass = 2,
        /// <summary>Duel: written by the server when the turn clock runs out. Never sent by a player.</summary>
        TurnExpired = 3,
        /// <summary>Solo: stop and reveal the board.</summary>
        GiveUp = 4,
        /// <summary>
        /// Host mode: cancels the move named by <see cref="AssociationMove.Cancels"/> (ADR 0025).
        /// Never applied by <see cref="AssociationEngine.Apply"/>: <see cref="AssociationEngine.Replay"/>
        /// skips both it and the move it cancels, so the log stays append-only.
        /// </summary>
        Undo = 5,
    }

    /// <summary>Where a Duel turn is. A turn opens exactly one Tile, then may Guess.</summary>
    public enum TurnPhase { MustOpen = 0, MayGuess = 1 }

    /// <summary>Why a game ended. The first two are reached by moves; the rest are decided by the server.</summary>
    public enum GameEndReason
    {
        FinalSolved = 0,
        /// <summary>Duel: every Tile open and every Seat has used its endgame turns.</summary>
        EndgameOver = 1,
        /// <summary>Solo: the board timer ran out.</summary>
        TimeUp = 2,
        GaveUp = 3,
        /// <summary>Duel: a player left. The Seat still there wins.</summary>
        Forfeit = 4,
        Abandoned = 5,
        /// <summary>Host mode: the Teacher pressed End game.</summary>
        EndedByHost = 6,
    }

    /// <summary>A solution and the other spellings that also count.</summary>
    public sealed record SolutionKey(string Text, IReadOnlyList<string> Acceptable);

    /// <summary>One Column: its four Tile ids in board order, and its solution.</summary>
    public sealed record ColumnKey(ColumnLetter Letter, IReadOnlyList<int> TileIds, SolutionKey Solution);

    /// <summary>
    /// Everything the engine knows about a Board: which Tile belongs to which Column, and the
    /// solutions. Tile <i>text</i> is not here — the engine never needs it.
    /// </summary>
    public sealed class BoardKey
    {
        public const int ColumnCount = 4;
        public const int TilesPerColumn = 4;

        public IReadOnlyList<ColumnKey> Columns { get; }
        public SolutionKey Final { get; }

        private readonly Dictionary<int, ColumnLetter> _columnOfTile;

        public BoardKey(IReadOnlyList<ColumnKey> columns, SolutionKey final)
        {
            if (columns.Count != ColumnCount)
                throw new ArgumentException($"A board has exactly {ColumnCount} columns.", nameof(columns));

            _columnOfTile = new Dictionary<int, ColumnLetter>();
            for (var i = 0; i < ColumnCount; i++)
            {
                var column = columns[i];
                if (column.Letter != (ColumnLetter)i)
                    throw new ArgumentException("Columns must be given in order A, B, C, D.", nameof(columns));
                if (column.TileIds.Count != TilesPerColumn)
                    throw new ArgumentException($"Column {column.Letter} must have exactly {TilesPerColumn} tiles.", nameof(columns));
                foreach (var tileId in column.TileIds)
                {
                    if (!_columnOfTile.TryAdd(tileId, column.Letter))
                        throw new ArgumentException($"Tile id {tileId} appears twice on the board.", nameof(columns));
                }
            }

            Columns = columns;
            Final = final;
        }

        public ColumnKey Column(ColumnLetter letter) => Columns[(int)letter];

        public bool TryGetColumnOf(int tileId, out ColumnLetter letter) => _columnOfTile.TryGetValue(tileId, out letter);
    }

    /// <summary>
    /// One thing a Seat did. <see cref="At"/> is the server's clock — the engine never reads a clock
    /// itself, so replaying the same moves always gives the same game.
    /// </summary>
    public sealed record AssociationMove(
        int Seat,
        MoveKind Kind,
        DateTime At,
        int? TileId = null,
        GuessTarget? Target = null,
        string? GuessText = null,
        int? Cancels = null)
    {
        public static AssociationMove Open(int seat, int tileId, DateTime at) => new(seat, MoveKind.OpenTile, at, TileId: tileId);
        public static AssociationMove Guess(int seat, GuessTarget target, string text, DateTime at) => new(seat, MoveKind.Guess, at, Target: target, GuessText: text);
        public static AssociationMove Pass(int seat, DateTime at) => new(seat, MoveKind.Pass, at);
        public static AssociationMove TurnExpired(int seat, DateTime at) => new(seat, MoveKind.TurnExpired, at);
        public static AssociationMove GiveUp(int seat, DateTime at) => new(seat, MoveKind.GiveUp, at);
        /// <param name="cancels">The 1-based position in the log of the move this one cancels.</param>
        public static AssociationMove Undo(int seat, int cancels, DateTime at) => new(seat, MoveKind.Undo, at, Cancels: cancels);
    }

    /// <summary>A solved Column: who got it, and what it was worth to them.</summary>
    public sealed record ColumnSolve(int Seat, int Points, bool ViaFinal);

    /// <summary>
    /// The whole state of a game, rebuilt by replaying its moves. Immutable: <see cref="AssociationEngine.Apply"/>
    /// returns a new one.
    /// </summary>
    public sealed record AssociationState
    {
        public required PlayStyle Style { get; init; }
        public required int SeatCount { get; init; }
        public required DateTime StartedAt { get; init; }

        /// <summary>Solo: when the board timer runs out. Null for a Duel, which has turn clocks instead.</summary>
        public DateTime? Deadline { get; init; }

        public ImmutableHashSet<int> OpenTiles { get; init; } = ImmutableHashSet<int>.Empty;
        public ImmutableDictionary<ColumnLetter, ColumnSolve> SolvedColumns { get; init; } = ImmutableDictionary<ColumnLetter, ColumnSolve>.Empty;

        /// <summary>The Seat that solved the Final solution, and what it earned, or null.</summary>
        public int? FinalSolvedBy { get; init; }
        public int FinalPoints { get; init; }

        public required ImmutableArray<int> Scores { get; init; }

        // ── Duel turn state (meaningless for Solo) ──
        public int CurrentSeat { get; init; }
        public TurnPhase Phase { get; init; }
        public DateTime TurnStartedAt { get; init; }

        /// <summary>
        /// Duel: endgame turns each Seat has started. Empty until the endgame begins — the first
        /// turn that starts with no closed Tile.
        /// </summary>
        public ImmutableArray<int> EndgameTurnsTaken { get; init; } = ImmutableArray<int>.Empty;

        public GameEndReason? EndReason { get; init; }

        /// <summary>Moves applied so far — the next move's sequence number is this plus one.</summary>
        public int MoveCount { get; init; }

        public bool IsOver => EndReason is not null;
        public bool InEndgame => !EndgameTurnsTaken.IsDefaultOrEmpty;
        public bool IsColumnSolved(ColumnLetter letter) => SolvedColumns.ContainsKey(letter);
        public bool IsFinalSolved => FinalSolvedBy is not null;

        /// <summary>When the current Duel turn's clock runs out.</summary>
        public DateTime TurnDeadline(AssociationRules rules) => TurnStartedAt.AddSeconds(rules.DuelTurnSeconds);
    }
}
