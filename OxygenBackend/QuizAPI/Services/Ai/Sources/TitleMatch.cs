using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>How well an article title answers a topic, by the words they share.</summary>
    /// <param name="Overlap">Topic words the title contains.</param>
    /// <param name="Precision">Share of the title's words that come from the topic. Low means the title is about something more specific, or something else.</param>
    /// <param name="Coverage">Share of the topic's words the title contains. Low means the title answers only part of what was asked.</param>
    public readonly record struct TitleScore(int Overlap, double Precision, double Coverage);

    /// <summary>
    /// Word overlap between a topic and an article title — the signal that picks the article.
    ///
    /// <para><b>Why words and not search rank.</b> Authors type phrases ("Rregullat e futbollit",
    /// "The human respiratory system"), and MediaWiki ranks phrase searches by body text: measured
    /// on 2026-10-29 the top hit for "Rregullat e futbollit" was <i>Kombëtarja polake e futbollit</i>
    /// (the Polish national team) and for "Kuzhina tradicionale shqiptare" a 28-word book stub. The
    /// title is the article's own summary of what it is about, so it is the thing to compare.</para>
    ///
    /// <para>Words are compared without diacritics (authors drop ë and ç) and, for words of five
    /// letters or more, by their first five letters — enough for Albanian inflection ("Kosovës",
    /// "Kosovë") and English plurals ("Balkans", "Balkan") without matching unrelated words.
    /// Function words of both languages are ignored.</para>
    /// </summary>
    public static class TitleMatch
    {
        private static readonly HashSet<string> Ignored = new(StringComparer.Ordinal)
        {
            // English
            "the", "of", "and", "in", "on", "for", "to", "with", "a", "an", "from", "by", "about",
            "how", "what", "why", "is", "are", "new",
            // The "s" of "What's new in C# 12" — the tokenizer splits at the apostrophe.
            "s",
            // Albanian, already stripped of diacritics
            "dhe", "ne", "nje", "te", "per", "nga", "e", "i", "se", "si", "me",
        };

        private static readonly Regex Token = new("[a-z0-9#+]+", RegexOptions.Compiled);

        public static IReadOnlyList<string> Words(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return Array.Empty<string>();
            return Token.Matches(Fold(text)).Select(m => m.Value).Where(w => !Ignored.Contains(w)).Distinct().ToList();
        }

        public static TitleScore Score(string topic, string title)
        {
            var topicWords = Words(topic);
            var titleWords = Words(title);
            if (topicWords.Count == 0 || titleWords.Count == 0) return new TitleScore(0, 0, 0);

            var overlap = titleWords.Count(t => topicWords.Any(w => Same(t, w)));
            return new TitleScore(overlap, (double)overlap / titleWords.Count, (double)overlap / topicWords.Count);
        }

        /// <summary>How many topic words a confident match must share: two, or all of them when the topic has fewer.</summary>
        public static int RequiredOverlap(string topic) => Math.Min(2, Math.Max(1, Words(topic).Count));

        private static bool Same(string a, string b) =>
            a == b || (a.Length >= 5 && b.Length >= 5 && string.CompareOrdinal(a, 0, b, 0, 5) == 0);

        private static string Fold(string text)
        {
            var sb = new StringBuilder(text.Length);
            foreach (var c in text.ToLowerInvariant().Normalize(NormalizationForm.FormD))
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
            return sb.ToString();
        }
    }
}
