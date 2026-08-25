using System.Text;

namespace QuizAPI.Services.Ai.CategoryPalette
{
    /// <summary>
    /// The one prompt this feature sends. Short on purpose — see the note on output size.
    /// </summary>
    public static class CategoryPalettePromptBuilder
    {
        /// <summary>
        /// Small enough that a runaway reply is impossible rather than merely unlikely. Three
        /// palettes of five hex strings is about 60 tokens of JSON; 300 leaves room for the
        /// model to be slightly verbose and none for it to write an essay. The quiz generator's
        /// 8000 would have let a confused model burn the daily budget on colour names.
        /// </summary>
        public const int MaxOutputTokens = 300;

        /// <summary>
        /// The model is told the category name and <b>nothing else</b> — not the existing
        /// categories, not their palettes.
        ///
        /// <para>Two reasons. The prompt stays a constant size no matter how large the table
        /// grows, which is what makes this safe to leave unmetered. And "is this colour too close
        /// to that one" is arithmetic the code does exactly, in <see cref="PaletteColor"/>, rather
        /// than something a language model approximates. Sending the palettes would cost tokens to
        /// get a worse answer.</para>
        /// </summary>
        public static string Build(CategoryPaletteRequest request)
        {
            var name = request.CategoryName.Trim();

            var sb = new StringBuilder();
            sb.AppendLine("You choose colour palettes for quiz categories in a web app.");
            sb.AppendLine();
            sb.AppendLine($"The category is called: \"{name}\".");
            sb.AppendLine();
            sb.AppendLine("Propose THREE different palettes that suit it. Guidance:");
            sb.AppendLine("- Each palette is 3 to 5 colours that work together.");
            sb.AppendLine("- The FIRST colour of each palette is the dominant one: it fills a card");
            sb.AppendLine("  behind short text, so it must not be so light or so mid-toned that");
            sb.AppendLine("  neither black nor white text would be readable on it.");
            sb.AppendLine("- Let the subject suggest the hue where there is an obvious association");
            sb.AppendLine("  (nature -> greens, ocean -> blues). Where there is none, just pick");
            sb.AppendLine("  something distinctive. Do not force a metaphor.");
            sb.AppendLine("- Make the three palettes clearly different from EACH OTHER, not three");
            sb.AppendLine("  shades of one idea.");
            sb.AppendLine();
            sb.AppendLine("Reply with JSON and nothing else. No prose, no code fence:");
            sb.AppendLine("{\"palettes\": [[\"#rrggbb\", \"#rrggbb\", \"#rrggbb\"], [...], [...]]}");
            sb.AppendLine();
            sb.AppendLine("Every colour MUST be lowercase 6-digit hex with a leading #.");

            return sb.ToString();
        }
    }
}
