# Typed-answer matching

How a `TypeTheAnswer` submission is judged. **This describes current behaviour.** The open proposal
for typo tolerance lives in
[`proposals/typed-answer-typo-tolerance.md`](../proposals/typed-answer-typo-tolerance.md).

Implementation is in one place: `QuizAPI/Services/Grading/TypeTheAnswerMatcher.cs`. Both the live
grader (`AnswerGradingService`, which singleplayer *and* multiplayer route through) and the question
preview (`TestQuestionService`) call it, so a preview can never disagree with real play. Tests:
`QuizAPI.Tests/Grading/TypeTheAnswerMatcherTests.cs`.

---

## The two things an author is choosing between

Authors reach for these settings for two different reasons, and it's worth keeping them apart:

| Complaint | Handled by |
|---|---|
| "They gave the right answer, just formatted differently" — `Café`/`Cafe`, `the Beatles`/`Beatles`, double spaces | **Normalisation.** Always on, no toggle. |
| "They typed a sentence with the answer inside it" | **Partial match.** Per-question toggle. |

Normalisation can't solve the second (`Eiffel` and `the Eiffel Tower` are genuinely different
lengths), and partial match is a sledgehammer for the first. Conflating them is what made the
original single switch confusing.

---

## 1. Normalisation — always on

Applied to the submission *and* every stored answer before anything is compared:

- trim, and collapse internal whitespace runs to a single space
- strip diacritics — `Café` → `cafe`, `Zürich` → `zurich`
- drop punctuation and symbols — `U.S.A.` → `usa`, `Mother's Day` → `mothers day`
- lower-case, **unless** the question is case-sensitive
- drop a single **leading** article (`the`, `a`, `an`, `le`, `la`, `el`, `der`, `die`, …)

Two deliberate limits:

- **Only the leading article is dropped.** One in the middle is carrying meaning — `Lord of the
  Rings` must not normalise to `Lord of Rings`.
- **A one-word answer is never stripped to nothing.** An answer of literally `"The"` survives;
  otherwise it would match everything.

A **case-sensitive** question still gets accent, spacing and punctuation normalisation. Those aren't
what "case-sensitive" means, and an author who wants exact capitalisation isn't asking to punish a
missing accent.

## 2. Exact match

The normalised submission against the normalised `CorrectAnswer`, then each `AcceptableAnswers`
entry. Blank alternatives are dropped — authors leave empty rows behind in the builder, and an empty
alternative would match everything once partial match is on.

## 3. Partial match — per-question toggle

**Whole-word containment**: the expected answer must appear as a complete word, or a contiguous run
of words, inside what the player typed.

| Expected | Player types | Result |
|---|---|---|
| `Eiffel` | `the Eiffel Tower` | ✅ — the point of the feature |
| `Eiffel Tower` | `it is the Eiffel Tower in Paris` | ✅ |
| `Eiffel Tower` | `the Eiffel is a Tower` | ❌ — must be a contiguous run |
| `Eiffel` | `Eiff` | ❌ — one-directional, see below |
| `cat` | `concatenate` | ❌ |
| `3` | `13` | ❌ |

**One-directional on purpose.** A prefix of the answer never passes: accepting `Eiff` for `Eiffel`
would let a player guess a letter at a time.

**Empty submissions can never be correct.** Every string contains the empty string, so without an
explicit guard an empty (or punctuation-only, which normalises to empty) answer would match
everything the moment partial match is enabled.

### The known limits of partial match

- **Negation passes.** `not Paris` contains `Paris`, and always will. This is inherent to accepting
  free text that *contains* the answer — no matching scheme fixes it. Worth knowing before enabling
  the toggle on a question where a negated answer is plausible.
- **Scripts without spaces** (Chinese, Japanese, Thai, Lao, Khmer, Myanmar) normalise to a single
  token, where word boundaries are meaningless. Those fall back to substring containment, so the
  `cat`/`concatenate` problem still exists *within* a token for them. Fixing it properly needs
  per-language segmentation. The fallback is gated on **the script of the expected answer**, not on
  the token count — see the 2026-08-02 note below for why that distinction matters. Korean is not
  included: Hangul is space-delimited and gets normal whole-word matching.
- **Short answers stay risky.** Even with whole-word matching, an answer of `cat` passes for anyone
  who types a sentence containing the word "cat". The builder's helper text now says so.

---

## Where these settings come from

`IsCaseSensitive` and `AllowPartialMatch` reach a question by three routes, and they are **not**
equally trustworthy:

| Route | `IsCaseSensitive` | `AllowPartialMatch` |
|---|---|---|
| Quiz builder / standalone question form | The author, via the switch. | The author, via the switch. |
| CSV import (`DataTransferController`) | The spreadsheet's column. | The spreadsheet's column. |
| **AI import** | The model (prompt says "almost always false"). | **Always `false`** — never taken from the model. |

**Partial matching is never set by the AI.** `prompt.ts` doesn't ask for it and `parse-ai-output.ts`
hard-codes `allowPartialMatch: false`, regardless of what the model emits (`.passthrough()` means a
model that sends it anyway isn't an error — the value is ignored).

The reasoning: partial matching is a **grading rule**, not a property of the question's content, so
it isn't something the model has any basis for judging. It was previously requested with no guidance
at all, which made the choice arbitrary. That cost nothing while the flag was inert; once it started
grading, an unguided `true` on a short answer produced a question a player could pass by typing a
sentence containing the word — with nothing in the review step drawing the author's eye to it.
Forcing `false` means the author opts in during review, where they can see the answer it applies to.

`IsCaseSensitive` is left to the model deliberately: it *is* a property of the content (a question
about proper capitalisation, say), the prompt gives it an explicit default, and getting it wrong
makes a question harder rather than easier to guess.

---

## What changed (2026-08-02)

The space-less-script fallback was firing far more often than intended. It was gated on
`expectedTokens.Length == 1 && haystackTokens.Length == 1` — "both sides are a single token" — which
is true of *any* one-word answer matched against a one-word submission, not just CJK. So a
single-word expected answer silently reverted to raw substring containment, which is precisely the
behaviour whole-word matching was introduced to remove: `concatenate` passed for `cat`, `money` for
`one`, `13` for `3`. `Bart Simpson` for `art` was rejected correctly only because the *submission*
happened to be two words — the guard never fired.

The fallback is now gated on the expected answer actually being written in a space-less script
(`IsSpacelessScript`: Han, kana, Thai, Lao, Khmer, Myanmar). Everything else falls through to the
contiguous-token-run comparison, where a single expected token is just token equality. The behaviour
documented above was always the intent; this is the code catching up to it. Caught by
`PartialMatchOn_RejectsSubstringInsideAWord`, which was already asserting the correct behaviour.

## What changed (2026-07-31)

Two rounds, same day:

1. `AllowPartialMatch` **was never read by any grader**, despite the builder rendering a switch
   labelled "Accept partial answers". The setting was persisted, round-tripped through the DTOs and
   the CSV import, and ignored — authors were configuring behaviour that never happened. Neither
   grader trimmed either, so `" Paris"` was graded wrong. And the logic was duplicated between the
   live grader and the preview, so they could drift. Fixed by extracting `TypeTheAnswerMatcher`.
2. That first implementation used raw `string.Contains`, matching the builder's original wording but
   with no word boundaries — it accepted `concatenate` for `cat` and `13` for `3`, making short
   answers guessable. Replaced with whole-word containment, and normalisation was split out as an
   always-on step rather than something bundled into the toggle.

---

## Related

- [`quiz-grading.md`](./quiz-grading.md) — how a graded answer becomes points.
- [`proposals/typed-answer-typo-tolerance.md`](../proposals/typed-answer-typo-tolerance.md) —
  accepting `parid` for `paris`. Open.
- [`proposals/partial-credit.md`](../proposals/partial-credit.md) — the parallel "how right is right
  enough" question for multi-select. Open.
