using System.Globalization;

namespace QuizAPI.Services.Ai.CategoryPalette
{
    /// <summary>
    /// Colour arithmetic for palette proposals: parsing, contrast, and how close two colours look.
    ///
    /// <para>This is the half of the feature the model does <b>not</b> do. The model names colours
    /// from a category name — a language problem. Whether <c>#0d9488</c> is too close to
    /// <c>#14b8a6</c>, or whether label text stays readable on it, is arithmetic, and asking a
    /// language model for it gets you a plausible answer that is occasionally wrong and never
    /// reproducible. See docs/entities/category-palettes.md.</para>
    /// </summary>
    public static class PaletteColor
    {
        /// <summary>
        /// Strict parse of <c>#rrggbb</c>. Deliberately narrow: no <c>#rgb</c>, no named colours,
        /// no <c>rgb()</c>.
        ///
        /// <para>The client's <c>parseQuizPalette</c> is tolerant by design — it falls back to the
        /// default palette on anything malformed, because a bad stored row must not break a quiz
        /// card. That is exactly the wrong behaviour when <i>accepting</i> something new: a
        /// rejected proposal would render as "nobody styled this category" and the failure would
        /// be invisible. Tolerant when reading what is already stored, strict when accepting
        /// something new.</para>
        /// </summary>
        public static bool TryParseHex(string? value, out (int R, int G, int B) rgb)
        {
            rgb = default;

            if (value is null || value.Length != 7 || value[0] != '#') return false;

            var body = value.AsSpan(1);
            for (var i = 0; i < 6; i++)
                if (!Uri.IsHexDigit(body[i])) return false;

            rgb = (
                int.Parse(body[..2], NumberStyles.HexNumber, CultureInfo.InvariantCulture),
                int.Parse(body.Slice(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture),
                int.Parse(body.Slice(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture));

            return true;
        }

        /// <summary>
        /// WCAG relative luminance. Mirrors <c>readableTextColor</c> in
        /// <c>src/pages/Quiz/components/quiz-palette.ts</c> — same formula, same reason: the eye is
        /// far more sensitive to green than blue, so a naive RGB average misjudges pure blue as
        /// mid and yellow as mid when neither is.
        /// </summary>
        public static double RelativeLuminance((int R, int G, int B) c)
        {
            static double Channel(int v)
            {
                var s = v / 255.0;
                return s <= 0.03928 ? s / 12.92 : Math.Pow((s + 0.055) / 1.055, 2.4);
            }

            return 0.2126 * Channel(c.R) + 0.7152 * Channel(c.G) + 0.0722 * Channel(c.B);
        }

        /// <summary>
        /// The better of the two contrast ratios available to us — black text or white text on
        /// this background. The card picks whichever wins, so this is the contrast a label will
        /// actually get.
        /// </summary>
        public static double BestTextContrast((int R, int G, int B) background)
        {
            var l = RelativeLuminance(background);
            var againstWhite = 1.05 / (l + 0.05);
            var againstBlack = (l + 0.05) / 0.05;
            return Math.Max(againstWhite, againstBlack);
        }

        /// <summary>WCAG AA for normal text. A palette colour below this can't carry a label.</summary>
        public const double MinTextContrast = 4.5;

        /// <summary>
        /// "Redmean" colour distance — a cheap, well-known approximation of perceptual difference
        /// that weights the channels by how red the pair is, which is where plain Euclidean RGB
        /// distance goes most wrong. Range is roughly 0–765.
        ///
        /// <para>Not CIEDE2000. That is more accurate and considerably more code, and the job here
        /// is "would a person mistake these two categories for each other in a list", not colour
        /// science. If the threshold ever needs to be trusted more finely than it is here, that is
        /// the moment to reach for a real Lab implementation.</para>
        /// </summary>
        public static double Distance((int R, int G, int B) a, (int R, int G, int B) b)
        {
            var rMean = (a.R + b.R) / 2.0;
            double dr = a.R - b.R, dg = a.G - b.G, db = a.B - b.B;

            return Math.Sqrt(
                (2 + rMean / 256) * dr * dr +
                4 * dg * dg +
                (2 + (255 - rMean) / 256) * db * db);
        }

        /// <summary>
        /// Below this, two categories read as "the same colour" at a glance in the selection list.
        ///
        /// <para>Chosen by eye against the seeded palettes, and deliberately forgiving: collisions
        /// are acceptable eventually (there are only so many distinguishable hues and categories
        /// keep being added), so this exists to stop a proposal landing right next to an existing
        /// one, not to guarantee uniqueness forever.</para>
        /// </summary>
        public const double TooSimilar = 70;
    }
}
