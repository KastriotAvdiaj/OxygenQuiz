using System.Text.RegularExpressions;

namespace QuizAPI.Services.Ai.Sources
{
    /// <summary>
    /// The first guess at a <b>topic's</b> language — English, Albanian, or unsure — from the words
    /// the author typed, before anything is looked up.
    ///
    /// <para><b>Why grounding needs this at all.</b> Ungrounded, the model infers the language while
    /// it writes, and the Phase 0 eval found it never got that wrong (0 of 116). Grounding has to
    /// know earlier: it must decide whether to search English or Albanian Wikipedia before the
    /// model is called. <see cref="SourceLanguageDetector"/> answers the same question for
    /// material, but a topic is two or three words — too few for function-word statistics.</para>
    ///
    /// <para><b>Signals, not statistics.</b> Albanian: ë or ç; an Albanian function word ("dhe",
    /// "në", "një"); the connectors "e", "i", "së" between two words ("Rregullat e futbollit"); the
    /// letter pairs xh, zh, gj and a q not followed by u; the stems shqip- and kosov-. English: an
    /// English function word; w, ph, or an -ing/-tion/-ology ending, none of which Albanian
    /// spelling produces. One side's signals and none of the other's decides it. Anything else —
    /// no signal, or both ("Kosovo war") — is <c>null</c>, and <see cref="QuizGrounding"/> asks
    /// Wikipedia which language has that exact title before asking the author.</para>
    ///
    /// <para>Measured on 2026-10-29 against 46 topics (the twelve eval topics and 34 more typical
    /// ones): no wrong answer, and unsure on 22 — almost all one- and two-word topics such as
    /// "Chemistry" or "Futbolli". The title check settles 17 of those 22. Rules for more languages
    /// belong here when <see cref="SourceLanguageDetector.Supported"/> grows.</para>
    /// </summary>
    public static class TopicLanguage
    {
        private static readonly HashSet<string> AlbanianWords = new(StringComparer.Ordinal)
        {
            "dhe", "në", "një", "të", "për", "nga", "është", "edhe", "ose", "apo", "mbi", "nën",
            "tek", "sipas", "gjatë", "ndër", "deri",
        };

        /// <summary>Albanian only between two words: "Vitamin E" and "World War I" end on these.</summary>
        private static readonly HashSet<string> AlbanianConnectors = new(StringComparer.Ordinal) { "e", "i", "së" };

        private static readonly HashSet<string> EnglishWords = new(StringComparer.Ordinal)
        {
            "the", "of", "and", "in", "on", "for", "to", "with", "a", "an", "from", "by", "about",
            "how", "what", "why", "is", "are",
        };

        private static readonly Regex Token = new(@"[^\W\d_]+", RegexOptions.Compiled);
        private static readonly Regex AlbanianLetters = new("[ëçËÇ]", RegexOptions.Compiled);
        // A q that is not "qu", inside a word: Albanian q is its own sound; English q is almost
        // always qu, and where it isn't it ends a name (Iraq), which the end-of-word check excludes.
        private static readonly Regex AlbanianDigraphs = new("xh|zh|gj|q(?!u)", RegexOptions.Compiled);
        private static readonly Regex EnglishSpelling = new("w|ph|(tion|sion|ology|ness|ing|ics)$", RegexOptions.Compiled);

        /// <summary><see cref="SourceLanguageDetector.English"/>, <see cref="SourceLanguageDetector.Albanian"/>, or <c>null</c> when unsure.</summary>
        public static string? Guess(string? topic)
        {
            if (string.IsNullOrWhiteSpace(topic)) return null;

            var albanian = AlbanianLetters.IsMatch(topic);
            var english = false;

            var tokens = Token.Matches(topic).Select(m => m.Value).ToList();
            for (var i = 0; i < tokens.Count; i++)
            {
                var word = tokens[i];
                var lower = word.ToLowerInvariant();

                if (AlbanianWords.Contains(lower)) albanian = true;
                // Case-sensitive on purpose: a capital "I" is the English pronoun or a numeral.
                if (AlbanianConnectors.Contains(word) && i > 0 && i < tokens.Count - 1) albanian = true;
                if (!lower.EndsWith('q') && AlbanianDigraphs.IsMatch(lower)) albanian = true;
                if (lower.StartsWith("shqip") || lower.StartsWith("kosov")) albanian = true;

                if (EnglishWords.Contains(lower)) english = true;
                if (EnglishSpelling.IsMatch(lower)) english = true;
            }

            return (albanian, english) switch
            {
                (true, false) => SourceLanguageDetector.Albanian,
                (false, true) => SourceLanguageDetector.English,
                _ => null,
            };
        }
    }
}
