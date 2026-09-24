using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Models.Associations;

namespace QuizAPI.Services.Associations
{
    /// <summary>
    /// The API's gate for Board content. The builder's zod schema mirrors these rules for fast
    /// feedback; this is the rule (CLAUDE.md: "Client validation mirrors an API rule").
    ///
    /// <para>Returns a <b>cleaned</b> copy (trimmed text, normalised acceptable-solution lists) so
    /// that what is stored — and what "did the Board change?" compares — is the clean form.</para>
    ///
    /// <para>A Board is always complete when saved, even as Draft: unfinished work is protected by
    /// the builder's local draft, not by storing half a Board (docs/quiz/associations.md).</para>
    /// </summary>
    public static class AssociationBoardValidator
    {
        private static readonly string[] Letters = { "A", "B", "C", "D" };

        /// <summary>Throws <see cref="AppValidationException"/> naming every problem, or returns the cleaned Board.</summary>
        public static AssociationBoardInput ValidateAndClean(AssociationBoardInput? input, int boardSeconds, AssociationRules rules)
        {
            var errors = new List<string>();

            if (boardSeconds < rules.SoloMinBoardSeconds || boardSeconds > rules.SoloMaxBoardSeconds)
                errors.Add($"Board time must be between {rules.SoloMinBoardSeconds} and {rules.SoloMaxBoardSeconds} seconds.");

            if (input is null)
                throw new AppValidationException(string.Join(" ", errors.Append("The board is missing.")));

            if (input.Columns is null || input.Columns.Count != AssociationBoardLimits.ColumnCount)
            {
                errors.Add($"A board has exactly {AssociationBoardLimits.ColumnCount} columns.");
                throw new AppValidationException(string.Join(" ", errors));
            }

            var clean = new AssociationBoardInput();
            for (var c = 0; c < AssociationBoardLimits.ColumnCount; c++)
            {
                var column = input.Columns[c] ?? new AssociationColumnInput();
                var letter = Letters[c];
                var cleanColumn = new AssociationColumnInput();

                if (column.Tiles is null || column.Tiles.Count != AssociationBoardLimits.TilesPerColumn)
                {
                    errors.Add($"Column {letter} needs exactly {AssociationBoardLimits.TilesPerColumn} tiles.");
                }
                else
                {
                    for (var t = 0; t < AssociationBoardLimits.TilesPerColumn; t++)
                        cleanColumn.Tiles.Add(Text(column.Tiles[t], $"{letter}{t + 1}", "Tile", errors));
                }

                cleanColumn.Solution = Text(column.Solution, $"Column {letter}", "Solution", errors);
                cleanColumn.AcceptableSolutions = Acceptable(column.AcceptableSolutions, cleanColumn.Solution, $"column {letter}", errors);
                clean.Columns.Add(cleanColumn);
            }

            clean.FinalSolution = Text(input.FinalSolution, "The final", "Solution", errors);
            clean.FinalAcceptableSolutions = Acceptable(input.FinalAcceptableSolutions, clean.FinalSolution, "the final solution", errors);

            if (errors.Count > 0)
                throw new AppValidationException(string.Join(" ", errors));

            return clean;
        }

        private static string Text(string? value, string where, string what, List<string> errors)
        {
            var trimmed = value?.Trim() ?? string.Empty;
            if (trimmed.Length == 0)
                errors.Add(what == "Tile" ? $"Tile {where} is empty." : $"{where} needs a solution.");
            else if (trimmed.Length > AssociationBoardLimits.MaxTextLength)
                errors.Add(what == "Tile"
                    ? $"Tile {where} is longer than {AssociationBoardLimits.MaxTextLength} characters."
                    : $"{where}'s solution is longer than {AssociationBoardLimits.MaxTextLength} characters.");
            return trimmed;
        }

        private static List<string> Acceptable(List<string>? values, string solution, string where, List<string> errors)
        {
            // Same cleaning typed answers get: trim, drop blanks and duplicates of each other or of
            // the solution. Case-insensitive, because a Guess is matched case-insensitively.
            var cleaned = AcceptableAnswerRules.Normalize(values, solution, isCaseSensitive: false);
            if (cleaned.Count > AssociationBoardLimits.MaxAcceptableSolutions)
                errors.Add($"Up to {AssociationBoardLimits.MaxAcceptableSolutions} other spellings are allowed for {where}.");
            if (cleaned.Any(v => v.Length > AssociationBoardLimits.MaxTextLength))
                errors.Add($"An alternative spelling for {where} is longer than {AssociationBoardLimits.MaxTextLength} characters.");
            return cleaned;
        }
    }
}
