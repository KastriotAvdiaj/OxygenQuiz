using System.ComponentModel.DataAnnotations;
using QuizAPI.Models.Associations;

namespace QuizAPI.DTOs.Quiz
{
    // ── Requests ─────────────────────────────────────────────────────────────

    /// <summary>Start (or resume) a Solo game of an Associations quiz.</summary>
    public class StartAssociationGameRequest
    {
        [Required]
        public int QuizId { get; set; }

        /// <summary>The share-link grant for an Unlisted quiz you don't own. Ignored otherwise.</summary>
        public string? ShareToken { get; set; }
    }

    public class OpenAssociationTileRequest
    {
        [Required]
        public int TileId { get; set; }
    }

    public class AssociationGuessRequest
    {
        /// <summary><c>A</c>, <c>B</c>, <c>C</c>, <c>D</c> or <c>Final</c>.</summary>
        [Required]
        public string Target { get; set; } = string.Empty;

        [Required]
        [MaxLength(AssociationGameLimits.MaxGuessLength)]
        public string Text { get; set; } = string.Empty;
    }

    /// <summary>Abandon a game and start a fresh one of the same quiz.</summary>
    public class RestartAssociationGameRequest
    {
        public string? ShareToken { get; set; }
    }

    // ── Views: what a client may see (docs/quiz/associations.md, "What the client sees") ──
    //
    // Built only by AssociationViews. A hidden Tile has no Text, an unsolved solution has no
    // Solution, and acceptable spellings are never here at all. AssociationViewSecrecyTests
    // serialises these and searches the JSON, so a field added here that leaks is caught.

    public class AssociationGameViewDTO
    {
        public Guid SessionId { get; set; }
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;

        /// <summary><c>Solo</c> or <c>Duel</c>. A Duel is read here only once it is over — it is played over the hub.</summary>
        public string PlayStyle { get; set; } = "Solo";

        public bool IsOver { get; set; }

        /// <summary><c>FinalSolved</c>, <c>TimeUp</c>, <c>GaveUp</c>, <c>Abandoned</c>, … Null while playing.</summary>
        public string? EndReason { get; set; }

        /// <summary>
        /// True when starting found this player's game already running and returned it instead of
        /// a new one. The page says so and offers a fresh start.
        /// </summary>
        public bool Resumed { get; set; }

        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }

        /// <summary>Solo: when the board timer runs out. The client counts down to it.</summary>
        public DateTime? DeadlineUtc { get; set; }

        /// <summary>The server's clock when this view was built — the client corrects its own clock by it.</summary>
        public DateTime ServerNow { get; set; }

        public int BoardSeconds { get; set; }

        /// <summary>The reader's score so far — their own Seat's.</summary>
        public int Score { get; set; }

        /// <summary>The reader's Seat: always 0 in Solo; 0 or 1 in a Duel.</summary>
        public int MySeat { get; set; }

        /// <summary>A Duel's Seats, in order, with names and scores (session ids not included). Empty for Solo.</summary>
        public List<DuelSeatDTO> Seats { get; set; } = new();

        /// <summary>A Duel's winner; null on a tie, and always for Solo.</summary>
        public int? WinnerSeat { get; set; }

        /// <summary>A closed Tile is left to open.</summary>
        public bool CanOpen { get; set; }

        /// <summary>A Guess is earned: a Tile was opened, or the last Guess was right (D18).</summary>
        public bool CanGuess { get; set; }

        /// <summary>Every Tile is open and a wrong Guess has been made since: the tries are counting down.</summary>
        public bool InEndgame { get; set; }

        /// <summary>In the endgame: wrong Guesses still allowed, this one included. Null otherwise.</summary>
        public int? EndgameTriesLeft { get; set; }

        public List<AssociationColumnViewDTO> Columns { get; set; } = new();
        public AssociationFinalViewDTO Final { get; set; } = new();

        /// <summary>Every accepted move, oldest first — the timeline on the results page.</summary>
        public List<AssociationMoveViewDTO> Moves { get; set; } = new();
    }

    public class AssociationColumnViewDTO
    {
        public string Letter { get; set; } = string.Empty;
        public List<AssociationTileViewDTO> Tiles { get; set; } = new();
        public bool Solved { get; set; }

        /// <summary>Once solved — or, for every Column, once the game is over.</summary>
        public string? Solution { get; set; }

        public int? Points { get; set; }
        public int? SolvedBySeat { get; set; }

        /// <summary>Collected by a correct Final rather than guessed on its own.</summary>
        public bool ViaFinal { get; set; }
    }

    public class AssociationTileViewDTO
    {
        public int Id { get; set; }
        public int Position { get; set; }
        public bool IsOpen { get; set; }

        /// <summary>Only when open, or once the game is over.</summary>
        public string? Text { get; set; }

        /// <summary>The Seat that opened it by hand; null when a solve revealed it, or it is closed.</summary>
        public int? OpenedBySeat { get; set; }
    }

    public class AssociationFinalViewDTO
    {
        public bool Solved { get; set; }

        /// <summary>Once solved, or once the game is over.</summary>
        public string? Solution { get; set; }

        public int? Points { get; set; }
        public int? SolvedBySeat { get; set; }
    }

    public class AssociationMoveViewDTO
    {
        public int Seq { get; set; }
        public int Seat { get; set; }
        public string Kind { get; set; } = string.Empty;
        public int? TileId { get; set; }
        public string? Target { get; set; }
        public string? GuessText { get; set; }
        public bool? IsCorrect { get; set; }
        public int Points { get; set; }
        public DateTime At { get; set; }
        /// <summary>Host mode, an Undo: the move it took back.</summary>
        public int? CancelsSeq { get; set; }
    }

    /// <summary>The answer to a move: the new view, and what the move itself did.</summary>
    public class AssociationMoveResultDTO
    {
        public AssociationGameViewDTO Game { get; set; } = new();

        /// <summary>For a Guess. Null for any other move — and when the board ran out of time before the move could count.</summary>
        public bool? IsCorrect { get; set; }

        public int Points { get; set; }

        /// <summary>Columns this move solved: the one guessed, or the ones a correct Final collected.</summary>
        public List<string> SolvedColumns { get; set; } = new();

        public bool FinalSolved { get; set; }
    }

    // ── Duel (docs/quiz/associations.md §10) ────────────────────────────────
    //
    // Both players see the same view — nothing in a Duel is private to one Seat — so it is built
    // once and broadcast to the lobby's group. Built only by AssociationViews.BuildDuel, from the
    // same column/final/move builders as the Solo view, so the secrecy rules are written once.

    public class DuelViewDTO
    {
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;

        public List<DuelSeatDTO> Seats { get; set; } = new();
        public int FirstSeat { get; set; }

        /// <summary>Whose turn it is. Null once the Duel is over.</summary>
        public int? CurrentSeat { get; set; }

        /// <summary>When the current turn's clock runs out (server clock). Null once over.</summary>
        public DateTime? TurnDeadlineUtc { get; set; }

        /// <summary>The server's clock when this view was built — the client corrects its own clock by it.</summary>
        public DateTime ServerNow { get; set; }

        public int TurnSeconds { get; set; }

        /// <summary>What the Seat whose turn it is may do now. The other Seat may do nothing.</summary>
        public bool CanOpen { get; set; }
        public bool CanGuess { get; set; }
        public bool CanPass { get; set; }

        /// <summary>Every Tile is open: turns are guesses only, and each Seat has a fixed number left.</summary>
        public bool InEndgame { get; set; }

        public bool IsOver { get; set; }

        /// <summary><c>FinalSolved</c>, <c>EndgameOver</c>, <c>Forfeit</c>. Null while playing.</summary>
        public string? EndReason { get; set; }

        /// <summary>Null while playing, and on a tie.</summary>
        public int? WinnerSeat { get; set; }

        public List<AssociationColumnViewDTO> Columns { get; set; } = new();
        public AssociationFinalViewDTO Final { get; set; } = new();
        public List<AssociationMoveViewDTO> Moves { get; set; } = new();
    }

    public class DuelSeatDTO
    {
        public int Seat { get; set; }
        public string Username { get; set; } = string.Empty;
        public int Score { get; set; }

        /// <summary>In the endgame: turns this Seat has left after the one it may be taking. Null otherwise.</summary>
        public int? EndgameTurnsLeft { get; set; }

        /// <summary>
        /// This player's results page (<c>/associations/results/{id}</c>). Only once the Duel is over
        /// and recorded — the session row doesn't exist before that.
        /// </summary>
        public Guid? SessionId { get; set; }
    }

    /// <summary>One accepted Duel move — or a server-decided ending — and the view after it.</summary>
    public class DuelUpdateDTO
    {
        /// <summary>The move. Null when the server ended the Duel (a forfeit), which is not a move.</summary>
        public AssociationMoveViewDTO? Move { get; set; }

        /// <summary>For a Guess. Null for any other move.</summary>
        public bool? IsCorrect { get; set; }

        public int Points { get; set; }
        public DuelViewDTO View { get; set; } = new();
    }
}
