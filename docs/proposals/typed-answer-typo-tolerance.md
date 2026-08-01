# Proposal: typo tolerance for typed answers

**Status: open.** Nothing implemented. Written 2026-07-31.

Should `"parid"` be accepted for `"paris"`?

Current behaviour — normalisation, exact match, optional whole-word partial match — is documented in
[`quiz/typed-answer-matching.md`](../quiz/typed-answer-matching.md). This proposal adds a step
*after* all of those.

---

## 1. The case for

A mistyped letter is a slip, not ignorance. This game is timed, which is precisely the condition
that produces motor errors — players are racing a clock and a speed bonus. All-or-nothing matching
means the scoreboard partly measures typing accuracy, which is not what any of these quizzes are
about.

Normalisation (already shipped) handles formatting differences. It does nothing for a genuine
keystroke error, and those are far more common under time pressure.

## 2. Algorithm

**Damerau-Levenshtein distance** — the minimum number of insertions, deletions, substitutions **and
transpositions** to turn one string into another.

Plain Levenshtein is simpler but misses the single most common typing error. `"paris"` → `"pairs"`
is one transposition, but *two* substitutions under plain Levenshtein — so tolerating it would
require a threshold loose enough to also admit genuinely different words. Damerau costs one extra
line and models real keyboards.

### Rejected alternatives

| Approach | Why not |
|---|---|
| **Soundex / Metaphone** (phonetic) | Matches how words sound — accepts "Filadelfia" for "Philadelphia", which is appealing. But it collapses genuinely distinct answers, and it's tuned for English. This app is explicitly multi-language (`QuestionLanguage` is a first-class entity), so an English phonetic algorithm is wrong for most of the catalog. |
| **Trigram / Jaccard similarity** | Bag-of-substrings, so it ignores order: "listen" and "silent" score identically to a real match. Fine for search ranking, wrong for grading. |
| **Jaro-Winkler** | Genuinely good for short strings, prefix-weighted, suits proper nouns. The honest second choice. Preferred against because "how many typos did you make" is a threshold an author can reason about and a support reply can explain; a 0–1 similarity score is not. |
| **Spell-check dictionary** | Needs per-language dictionaries, doesn't help with proper nouns (most quiz answers), and would happily accept a correctly-spelled *wrong* word. |

## 3. Threshold

A fixed distance is wrong at both ends. Distance 1 on a 3-letter answer is a large fraction of the
word — `"cat"`/`"bat"`, `"Rome"`/`"Nome"` are different answers, not typos. Distance 1 on a
15-letter answer is obviously a slip. So scale it:

| Answer length | Allowed distance |
|---|---|
| 1–4 | 0 (exact only) |
| 5–8 | 1 |
| 9+ | 2 |

Short answers get no tolerance at all, deliberately: that's exactly where near-misses are usually
different answers. `"paris"` (5 chars) gets distance 1, so `"parid"` and `"pairs"` pass while
`"perus"` (distance 2) does not.

## 4. Interaction with existing settings

- **`IsCaseSensitive` on → fuzzy off.** An author demanding exact capitalisation is asking for
  exactness; silently accepting a typo contradicts that.
- **`AllowPartialMatch` on → fuzzy off.** Fuzzy containment explodes the false-positive surface:
  any long submission contains *something* within edit distance of a short answer. Keep them
  mutually exclusive.
- **`AcceptableAnswers`** — each alternative fuzzy-matched independently, threshold from its own
  length.
- **Order:** normalise → exact → partial (if on) → fuzzy (if on). Fuzzy last, so it can only turn a
  *wrong* into a *right* and never changes an answer that already passes.

## 5. Rollout

**Per-question opt-in, defaulting to off.** A new `AllowTypoTolerance` bool beside the existing two
switches.

- It changes scoring. Enabling it globally silently re-grades every existing quiz's future plays,
  and in multiplayer it changes who wins a round.
- Spelling and vocabulary quizzes need it off, and their authors can't anticipate the change.
- Off-by-default means nothing moves on deploy.

Cost: one migration, one DTO field, one builder switch, one branch in `TypeTheAnswerMatcher`.

## 6. Risks

- **False positives are invisible.** A player who was wrong and got a point never complains. Only
  false *negatives* generate reports, so this will look better in production than it is. Whatever
  threshold ships should be reviewed against real submissions, not intuition.
- **Multiplayer amplifies it.** A bad accept in singleplayer is a wrong score; in a live match it
  decides the round against another player.
- **Numeric answers.** `"1999"`/`"1998"` is distance 1. The length rule protects short numbers
  (≤4 → exact only), but `"1,000,000"`/`"1,000,001"` would pass at 9+ chars. **Skip fuzzy entirely
  when the expected answer is all digits** — a number is right or wrong.
- **Short-token scripts.** Edit distance over a 2-character Chinese answer is meaningless. The
  length rule handles this incidentally (≤4 → exact), but incidentally, not by design.

## 7. Sketch

```csharp
// In TypeTheAnswerMatcher, after the exact and partial passes.
// Inputs are already normalised.
if (!question.AllowTypoTolerance || question.IsCaseSensitive || question.AllowPartialMatch)
    return false;

foreach (var expected in expectedAnswers)
{
    if (expected.All(char.IsDigit)) continue;       // numbers are exact-or-wrong

    var budget = expected.Length switch
    {
        <= 4 => 0,
        <= 8 => 1,
        _    => 2,
    };

    if (budget > 0 && DamerauLevenshteinWithin(expected, answer, budget))
        return true;
}
return false;
```

Use the **bounded** form — it can stop as soon as the running distance exceeds `budget`, which is
much cheaper than filling the whole matrix, and this runs on every submission in a live match.

---

## Related

- [`quiz/typed-answer-matching.md`](../quiz/typed-answer-matching.md) — current behaviour.
- [`quiz/quiz-grading.md`](../quiz/quiz-grading.md) — how correctness becomes points.
