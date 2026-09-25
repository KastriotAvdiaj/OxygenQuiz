using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using QuizAPI.Models.Quiz;
using QuizAPI.Services.Associations;

namespace QuizAPI.Models.Associations
{
    /// <summary>
    /// One Board being played — by one player (Solo) or by two taking turns (Duel).
    /// See docs/quiz/associations.md, "Playing".
    ///
    /// <para><b>The move log is the source of truth</b>
    /// (docs/adr/0020-an-associations-game-is-its-move-log.md). This row holds only what the moves
    /// can't: which Board, when it started, the Solo deadline, a server-decided ending, and the rules
    /// snapshot. Which Tiles are open, what is solved and every score are rebuilt by replaying
    /// <see cref="Moves"/> through <see cref="AssociationEngine"/>; nothing here caches them.</para>
    /// </summary>
    public class AssociationGame
    {
        [Key]
        public Guid Id { get; set; }

        /// <summary>The exact Board version played. Restrict: a Board a game points at is history.</summary>
        public int BoardId { get; set; }

        [ForeignKey(nameof(BoardId))]
        public AssociationBoard Board { get; set; } = null!;

        public PlayStyle PlayStyle { get; set; }

        /// <summary>The multiplayer match (Duel). Null for Solo.</summary>
        public Guid? MatchId { get; set; }

        [ForeignKey(nameof(MatchId))]
        public Match? Match { get; set; }

        /// <summary>
        /// Duel: the Seat that opened first (chosen at random; a rematch alternates). Replay needs
        /// it, because the engine's start state depends on it. Always 0 for Solo.
        /// </summary>
        public int FirstSeat { get; set; }

        /// <summary>
        /// How many Seats take turns: 1 for Solo, 2 for a Duel. Replay needs it for the same reason it
        /// needs <see cref="FirstSeat"/> — turn order is <c>(seat + 1) % seatCount</c> — and it can't be
        /// counted from <see cref="Players"/>: deleting one Duel player's session removes their row
        /// and leaves the game, which is still the other player's record.
        /// </summary>
        public int SeatCount { get; set; } = 1;

        /// <summary>App clock, never SQL <c>now()</c> — the deadline is computed from it.</summary>
        public DateTime StartedAt { get; set; }

        public DateTime? EndedAt { get; set; }

        /// <summary>Solo: when the board timer runs out (<see cref="StartedAt"/> + board time). Null for a Duel.</summary>
        public DateTime? DeadlineUtc { get; set; }

        /// <summary>
        /// Why the game ended; null while it is being played. For an ending a move reaches
        /// (<c>FinalSolved</c>, <c>GaveUp</c>, <c>EndgameOver</c>) replay agrees with it; for one the
        /// server decides (<c>TimeUp</c>, <c>Forfeit</c>, <c>Abandoned</c>) replay reapplies it.
        /// </summary>
        public GameEndReason? EndReason { get; set; }

        /// <summary>
        /// The <see cref="AssociationRules"/> this game is played with, as JSON. Written when the game
        /// starts and never updated, so changing <c>Associations:Rules</c> never rescores a game
        /// already played. Replay reads this, never the current configuration.
        /// </summary>
        public string RulesJson { get; set; } = string.Empty;

        public ICollection<AssociationGamePlayer> Players { get; set; } = new List<AssociationGamePlayer>();
        public ICollection<AssociationGameMove> Moves { get; set; } = new List<AssociationGameMove>();
    }

    /// <summary>
    /// Ties one player's <see cref="QuizSession"/> to a game. <b>A Seat is who takes a turn, not who
    /// a person is</b>: in Solo and Duel each Seat is one session; a future team duel puts two
    /// sessions on one Seat. A session plays exactly one game (unique <see cref="SessionId"/>).
    /// </summary>
    public class AssociationGamePlayer
    {
        public Guid GameId { get; set; }

        [ForeignKey(nameof(GameId))]
        public AssociationGame Game { get; set; } = null!;

        public Guid SessionId { get; set; }

        [ForeignKey(nameof(SessionId))]
        public QuizSession Session { get; set; } = null!;

        public int Seat { get; set; }
    }

    /// <summary>
    /// One accepted move. A refused move is an error, never a row. Named <c>…GameMove</c> so it
    /// can't be confused with the engine's <see cref="AssociationMove"/> record, which it maps to.
    /// </summary>
    public class AssociationGameMove
    {
        [Key]
        public long Id { get; set; }

        public Guid GameId { get; set; }

        [ForeignKey(nameof(GameId))]
        public AssociationGame Game { get; set; } = null!;

        /// <summary>1, 2, 3… within the game. Unique per game: two requests racing to append the same move can't both land.</summary>
        public int Seq { get; set; }

        public int Seat { get; set; }

        public MoveKind Kind { get; set; }

        /// <summary><c>OpenTile</c> only.</summary>
        public int? TileId { get; set; }

        /// <summary><c>Guess</c> only.</summary>
        public GuessTarget? Target { get; set; }

        /// <summary>The Guess as typed (trimmed) — for the review, and for the opponent in a Duel.</summary>
        [MaxLength(AssociationGameLimits.MaxGuessLength)]
        public string? GuessText { get; set; }

        /// <summary><c>Guess</c> only.</summary>
        public bool? IsCorrect { get; set; }

        /// <summary>
        /// What the move earned — 0 unless a correct Guess. Written for readers that don't replay
        /// (a future analytics query); replay recomputes it and never reads this.
        /// </summary>
        public int Points { get; set; }

        /// <summary>Server clock.</summary>
        public DateTime At { get; set; }
    }

    public static class AssociationGameLimits
    {
        /// <summary>
        /// Longest Guess stored. Twice a solution's own limit, so any honest attempt fits; longer
        /// input is refused rather than cut, since a cut Guess could match when the whole one didn't.
        /// </summary>
        public const int MaxGuessLength = 2 * AssociationBoardLimits.MaxTextLength;
    }
}
