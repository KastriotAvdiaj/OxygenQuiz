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
        /// palettes of five hex strings is about 60 tokens of JSON. The quiz generator's 4000
        /// would have let a confused model burn the daily budget on colour names.
        ///
        /// <para><b>Why this is 1500 and not the 60 the answer needs.</b> It was 300, and on a
        /// <i>reasoning</i> model that is a hang, not a tight budget. Reasoning tokens are spent
        /// before the first content token and they count against <c>max_tokens</c>, so
        /// <c>openai/gpt-oss-120b</c> on Groq consumed the whole 300 thinking, returned an empty
        /// content channel, and JSON mode rejected the empty string: HTTP 400
        /// <c>json_validate_failed</c> with <c>"failed_generation": ""</c>. Nothing in that
        /// message points at the ceiling, which is why it is spelled out here.
        ///
        /// <para>1500 is headroom for the thinking, not for the answer — pair it with
        /// <c>Ai:ReasoningEffort = "low"</c> so the thinking stays short. It is still under a
        /// fifth of the generator's ceiling, and at Groq gpt-oss-120b rates the worst possible
        /// single call is about $0.0009. A non-reasoning model does not need any of this and
        /// will emit its ~60 tokens and stop.</para></para>
        /// </summary>
        public const int MaxOutputTokens = 1500;

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
