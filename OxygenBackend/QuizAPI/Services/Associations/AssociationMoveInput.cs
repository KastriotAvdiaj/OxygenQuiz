using QuizAPI.Models.Associations;

namespace QuizAPI.Services.Associations
{
    /// <summary>
    /// What a player typed, checked the same way for Solo (HTTP) and a Duel (the hub), and the
    /// sentence a player is told when the engine refuses a move. One copy, so the two ways to play
    /// can't drift into different rules for the same input.
    /// </summary>
    internal static class AssociationMoveInput
    {
        public const string BadTarget = "A guess is for column A, B, C or D, or for the final solution.";
        public const string EmptyGuess = "Type a guess first.";
        public static readonly string GuessTooLong = $"A guess can be at most {AssociationGameLimits.MaxGuessLength} characters.";

        /// <summary><c>A</c>–<c>D</c> or <c>Final</c>, any case. Names only: <c>Enum.TryParse</c> would also take "4" or "-1".</summary>
        public static bool TryParseTarget(string? target, out GuessTarget parsed)
        {
            foreach (var name in Enum.GetNames<GuessTarget>())
            {
                if (string.Equals(name, target?.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    parsed = Enum.Parse<GuessTarget>(name);
                    return true;
                }
            }
            parsed = default;
            return false;
        }

        /// <summary>The trimmed Guess, or the reason it can't be one. Longer input is refused, not cut: a cut Guess could match when the whole one didn't.</summary>
        public static string? CheckGuess(string? text, out string trimmed)
        {
            trimmed = (text ?? string.Empty).Trim();
            if (trimmed.Length == 0) return EmptyGuess;
            if (trimmed.Length > AssociationGameLimits.MaxGuessLength) return GuessTooLong;
            return null;
        }

        /// <summary>What the player is told when the engine refuses a move.</summary>
        public static string Describe(MoveRejection rejection) => rejection switch
        {
            MoveRejection.GameOver => "This game is already over.",
            MoveRejection.UnknownTile => "That tile isn't on this board.",
            MoveRejection.TileAlreadyOpen => "That tile is already open.",
            MoveRejection.TargetAlreadySolved => "That one is already solved.",
            MoveRejection.EmptyGuess => EmptyGuess,
            MoveRejection.Malformed => "That move is missing something.",
            MoveRejection.BoardTimeUp => "Time is up.",
            MoveRejection.TurnTimeUp => "Time's up.",
            MoveRejection.NotYourTurn => "It isn't your turn.",
            MoveRejection.MustOpenATileFirst => "Open a tile first.",
            MoveRejection.AlreadyOpenedThisTurn => "You've already opened a tile this turn.",
            _ => "That move isn't allowed here.",
        };
    }
}
