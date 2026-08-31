# 3. The model proposes, the code decides

Date: 2026-08-23
Status: Accepted

## Context

Admins pick a colour palette for every new category by hand, in a 429-line picker. The palette
is not decoration: a quiz has no colours of its own and inherits its category's, so this choice
is what lets someone scan the quiz list and tell at a glance what a card is about.

We want an AI to propose one. The question is what, exactly, we let it decide.

Two failure modes bound the answer.

**The silent one.** `parseQuizPalette` falls back to `DEFAULT_QUIZ_PALETTE` on anything
malformed. That is correct for *reading stored data* — a bad row must not break a quiz card —
and exactly wrong for *accepting a proposal*: a rejected palette would render as "nobody styled
this category yet" and nobody would ever know the feature had failed.

**The expensive one.** A model call with the quiz generator's 8000-token ceiling, on a feature
with no quota, can spend the daily budget that quiz generation depends on.

And one thing the model is simply not good at: *"is #0d9488 too close to #14b8a6"* and *"can
label text be read on this"* are arithmetic. A language model gives a plausible answer that is
occasionally wrong and never reproducible. `readableTextColor` has done the contrast half
deterministically since the palettes existed.

Alternatives considered and rejected:

- **A curated set of ~12 palettes; the model returns an index.** Trivially safe, but caps the
  product at twelve looks. Categories keep being added, and the whole point of the colour is to
  tell them apart.
- **The model writes the category row directly.** Removes the confirm step entirely. Also makes
  a bad generation a permanent row in a lookup table every quiz, filter and facet reads from.
- **Send the model the existing palettes so it can avoid them.** Grows the prompt linearly with
  the table — on the one feature whose safety argument is that its prompt is a constant size —
  to get a worse answer than a distance function gives for free.

## Decision

**The model names colours. The code decides whether they are usable, and a human decides
whether to keep them.**

Concretely:

1. **It proposes; it never writes.** `POST /api/questioncategories/ai-palette` returns
   candidates. No category row is created or updated anywhere in the path. The admin picks one,
   edits it in the existing picker, or ignores all three.
2. **Free hex, strictly validated.** The model returns `#rrggbb` strings — not an index into a
   fixed set, because that would cap variety. `PaletteColor.TryParseHex` accepts only 6-digit
   lowercase hex; a palette outside 3–5 colours, or whose dominant colour fails WCAG AA
   (contrast < 4.5 against both black and white), is dropped. If nothing survives, the request
   **fails loudly** rather than falling back to a default.
3. **The model is told the category name and nothing else.** No category list, no existing
   palettes. The prompt is a constant size regardless of how large the table grows.
4. **Separation is measured, not asked for.** Every candidate's dominant colour is compared
   against every stored palette with a redmean distance, and a collision is *annotated with the
   name of the category it clashes with* — not dropped. The admin is choosing; "this looks like
   Geography" is more useful than a candidate quietly disappearing.
5. **Three candidates in one call.** "Give me another" is a click through a local list, not a
   second model call. No regenerate button, no exclusion list, no cap to stop someone farming it,
   and no need to define how different "different" is.
6. **Unmetered, not unbounded.** No quota decrement — only admins create categories, and charging
   a user's daily quiz allowance for a colour would be a nasty surprise. But the call is capped
   at 1500 output tokens (`CategoryPalettePromptBuilder.MaxOutputTokens`; this ADR and its Context
   section were written against an earlier 300-token ceiling — see `docs/entities/category-palettes.md`
   for why it was raised), checked against `Ai:DailyBudgetUsd` / `Ai:MonthlyBudgetUsd` *before* it
   is made, obeys the `Ai:Enabled` kill switch, and writes a row to `AiGenerationUsage` whichever
   way it ends.

## Consequences

- **A new `AiGenerationMode.PaletteProposal`.** These rows sit in the quiz generation ledger with
  `Topic`, `SourceChars`, `QuestionsRequested` and `QuestionsReturned` at their defaults. That is
  the price of the budget caps being able to see this feature's spend, and it means anything
  reading those columns must filter on `Mode` first.
- **`IQuizAiProvider.CompleteJsonAsync` gained a per-call token ceiling.** Both implementations
  and both existing call sites changed. The global `Ai:MaxOutputTokens` is sized for a
  15-question quiz, and vendors reserve `max_tokens` up front, so without this every caller pays
  for the largest caller's headroom.
- **Bad output is visible.** A rejected proposal surfaces as an error in the form. This is the
  point, and it is the opposite of what the client's tolerant parser does with stored data. The
  general rule worth carrying elsewhere: **tolerant when reading what is already stored, strict
  when accepting something new.**
- **Palette collisions will happen eventually** and are accepted. There are only so many
  distinguishable hues; the distance check exists to stop a proposal landing right beside an
  existing category, not to guarantee uniqueness forever.
- **This constrains the next AI feature here.** Anything that writes a lookup row without a human
  in the loop is a different decision and needs its own ADR — it does not inherit this one.
