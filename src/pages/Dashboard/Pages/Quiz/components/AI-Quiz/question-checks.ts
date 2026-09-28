/**
 * Deterministic quality checks on a generated question — no model, no network, no cost.
 *
 * These run inside `parseAiOutput`, so **both AI paths get them**: a reply our server
 * generated and a reply pasted from the user's own model go through exactly the same gate
 * (docs/quiz/ai-quiz-two-paths.md). A question that fails one is dropped with a reason and
 * reported by `ImportNotices`, like every other drop.
 *
 * Each check targets a failure a weak model produces often and a reviewer misses easily:
 *
 *  - **Duplicate options** — two options that are the same answer. At best a wasted slot; at
 *    worst one is marked correct and the other isn't, so a player who picks the "wrong" copy is
 *    marked wrong for the right answer.
 *  - **Contradictory key** — `allowMultipleSelections: false` with more than one option marked
 *    correct. The model has told us two different things about the answer; we can't know which
 *    it meant, so we don't guess.
 *  - **Giveaway** — the correct answer is written in the question text ("What is Harry Potter's
 *    surname?"). Only counted when no wrong option also appears there, so "Is a whale a mammal
 *    or a fish?" is not flagged.
 *  - **Repeated question** — the same question twice in one batch. Weak models loop.
 *  - **Quote not in source** — the model cited a sentence from the source material that isn't
 *    there. That is direct evidence it made the fact up, and the one check here that catches a
 *    wrong *fact* rather than a malformed question. See docs/quiz/ai-question-accuracy-plan.md.
 *
 * What these deliberately do NOT do: judge whether an answer is *true*. Only grounding in a
 * source (the quote check) or an independent verifier can do that. These catch the cheap,
 * structural half of the problem so the expensive half has less to do.
 *
 * Every rule here is a client-side quality gate, not an API rule: `ai-import` accepts a quiz
 * with duplicate options if a human saves one. The author in the review step has the last word;
 * these only decide what reaches them.
 */

/** Shortest normalised answer the giveaway check will look for. "4" or "Au" in a question is noise. */
const MIN_GIVEAWAY_ANSWER_LENGTH = 3;

/**
 * Shortest quote, in words, that counts as evidence. A one-word "quote" such as "Paris" is found
 * in almost any text about France and proves nothing about the question.
 */
export const MIN_QUOTE_WORDS = 4;

/**
 * Folds text to a comparable form: case, diacritics, quote and dash styles, punctuation and
 * whitespace all disappear, leaving lowercase words separated by single spaces.
 *
 * Diacritics are folded on purpose. The comparisons here ask "is this the same answer / the same
 * sentence", and a model that writes "Tirane" for "Tiranë", or straight quotes for curly ones, has
 * not made a different claim. Letters and digits from any script survive (`\p{L}`, `\p{N}`).
 */
export const normalizeForMatch = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Whole-word containment on normalised text: "art" is not found in "start". */
const containsPhrase = (haystack: string, needle: string): boolean =>
  needle.length > 0 && ` ${haystack} `.includes(` ${needle} `);

export interface OptionLike {
  text: string;
  isCorrect: boolean;
}

/** Option texts that appear more than once after normalisation. Empty when all are distinct. */
export const findDuplicateOptions = (options: OptionLike[]): string[] => {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const option of options) {
    const key = normalizeForMatch(option.text);
    if (seen.has(key)) duplicates.push(option.text.trim());
    else seen.set(key, option.text);
  }
  return duplicates;
};

/**
 * True when `answer` is written in the question and none of `wrongAnswers` is. The second half is
 * what keeps "Is a whale a mammal or a fish?" from being flagged: naming every option in the
 * stem is a legitimate way to write a question, naming only the right one is not.
 */
export const givesAwayAnswer = (
  questionText: string,
  answer: string,
  wrongAnswers: string[] = []
): boolean => {
  const needle = normalizeForMatch(answer);
  if (needle.length < MIN_GIVEAWAY_ANSWER_LENGTH) return false;

  const stem = normalizeForMatch(questionText);
  if (!containsPhrase(stem, needle)) return false;

  return !wrongAnswers.some((wrong) => {
    const w = normalizeForMatch(wrong);
    return w.length > 0 && containsPhrase(stem, w);
  });
};

export type QuoteCheck =
  /** Every fragment of the quote was found in the source, in order. */
  | "found"
  /** The quote is present but not in the source — evidence of an invented fact. */
  | "not-found"
  /** Too short to prove anything; treated as no quote. */
  | "too-short";

/**
 * Is `quote` actually in `source`?
 *
 * Compared after {@link normalizeForMatch}, so punctuation, case, curly quotes and line breaks
 * from a pasted PDF don't cause a false miss. An ellipsis (`...` or `…`) in the quote is allowed
 * and splits it into fragments that must each appear, in order — models abbreviate long sentences
 * that way, and it is still a verbatim claim about the text.
 *
 * Exact after normalisation, not fuzzy. A fuzzy match is what a paraphrase passes, and a
 * paraphrase is exactly where an invented detail hides.
 */
export const checkQuoteInSource = (quote: string, source: string): QuoteCheck => {
  const fragments = quote
    .split(/\.{3,}|…/)
    .map(normalizeForMatch)
    .filter((f) => f.length > 0);

  const wordCount = fragments.reduce((n, f) => n + f.split(" ").length, 0);
  if (wordCount < MIN_QUOTE_WORDS) return "too-short";

  const haystack = ` ${normalizeForMatch(source)} `;
  let from = 0;
  for (const fragment of fragments) {
    const at = haystack.indexOf(` ${fragment} `, from);
    if (at === -1) return "not-found";
    from = at + fragment.length + 1;
  }
  return "found";
};

/**
 * Tracks question texts across one batch so a repeat can be dropped. The first occurrence wins,
 * which keeps the model's ordering intact.
 */
export const createRepeatDetector = () => {
  const seen = new Set<string>();
  return (questionText: string): boolean => {
    const key = normalizeForMatch(questionText);
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  };
};
