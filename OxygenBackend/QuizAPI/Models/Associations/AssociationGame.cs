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

        // ── Host mode only (PlayStyle.Hosted — docs/quiz/classroom.md, ADR 0023) ──────────
        // A hosted game has no sessions: its Seats are Teams, and the game is its host's.

        /// <summary>The Teacher who hosts it. Null for Solo and Duel.</summary>
        public Guid? HostUserId { get; set; }
        public ICollection<HostedTeam> Teams { get; set; } = new List<HostedTeam>();

        /// <summary>The game clock, in seconds; null for "No time limit" (then <see cref="TurnSeconds"/> is null too).</summary>
        public int? GameSeconds { get; set; }
        /// <summary>The turn clock: 30, 60, 90 or 120 seconds, required with <see cref="GameSeconds"/>.</summary>
        public int? TurnSeconds { get; set; }

        /// <summary>
        /// When the game clock runs out, while the game is running. Clocks are deadlines while
        /// running and are pushed back by the length of a pause on resume, so a paused game loses
        /// no time. Unlike a Duel's turn clock these live here, not in the engine: a pause, a
        /// restart or next week's lesson must not lose them.
        /// </summary>
        public DateTime? GameDeadlineUtc { get; set; }
        /// <summary>When the current Team's turn runs out.</summary>
        public DateTime? TurnDeadlineUtc { get; set; }
        /// <summary>Set while paused. Both deadlines are frozen meanwhile.</summary>
        public DateTime? PausedAt { get; set; }

        /// <summary>
        /// The game clock has run out and this is the last round: the game ends when the turn would
        /// come back to <see cref="FirstSeat"/>, so every Team has had the same number of turns.
        /// </summary>
        public bool LastRound { get; set; }

        /// <summary>The last move, pause or resume — what the 7-day abandonment counts from.</summary>
        public DateTime? LastActivityAt { get; set; }

        /// <summary>
        /// The live Screen code, or null when none has been issued. Valid while the game is
        /// unfinished; replaced by "disconnect all screens" (ADR 0024).
        /// </summary>
        [MaxLength(HostedTeam.ScreenCodeLength)]
        public string? ScreenCode { get; set; }
    }

    /// <summary>
    /// One Team of a hosted game: the Seat it takes, its name and colour, and its students as they
    /// were that day — a copy, so editing the Class later doesn't rewrite a past game.
    /// </summary>
    public class HostedTeam
    {
        public const int MaxNameLength = 30;
        public const int ScreenCodeLength = 8;

        public Guid GameId { get; set; }
        [ForeignKey(nameof(GameId))]
        public AssociationGame Game { get; set; } = null!;

        public int Seat { get; set; }

        [MaxLength(MaxNameLength)]
        public string Name { get; set; } = string.Empty;

        /// <summary>A palette name the client knows ("red", "blue", "green", "yellow").</summary>
        [MaxLength(20)]
        public string Colour { get; set; } = string.Empty;

        /// <summary>The students' first names, as a JSON array.</summary>
        public string StudentsJson { get; set; } = "[]";
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

        /// <summary><c>Undo</c> only: the <see cref="Seq"/> of the move it cancels (ADR 0025).</summary>
        public int? CancelsSeq { get; set; }
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
