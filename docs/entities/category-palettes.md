# Category colour palettes

Where a quiz's colours come from, who chooses them, and how the AI proposer fits in.

Companion to [`lookup-entities.md`](./lookup-entities.md) (the three lookup tables) and
[`../adr/0003-the-model-proposes-the-code-decides.md`](../adr/0003-the-model-proposes-the-code-decides.md)
(why the AI is allowed to do so little).

---

## 1. A quiz has no colours of its own

```
Category.ColorPaletteJson  →  every quiz in that category  →  QuizCard, start modal, lobby picker
```

`CreateQuizInput` has no palette field. Everything that paints itself with a quiz's colour goes
through `parseQuizPalette` in `src/pages/Quiz/components/quiz-palette.ts`, which falls back to
`DEFAULT_QUIZ_PALETTE` (`#6366f1 / #3b82f6 / #06b6d4`) on a missing or malformed value.

A palette is **2–5 hex colours** plus a `gradient` boolean, edited in `color-palette-input.tsx`
with a live `QuizCard` preview.

> `gradient` is stored, editable and filterable but **never rendered** — the only component that
> reads it has no call sites. See [`../deployment/known-issues.md`](../deployment/known-issues.md).
> The proposer leaves it alone for that reason.

## 2. What the palette is for

Telling categories apart in a list. A user learns "my Geography quizzes are the teal ones", and
where a subject has an obvious colour association the palette may as well use it.

Both halves of that matter, and they pull in different directions — which is what decides the
split of work below. "What colour is Astronomy" is a language question. "Are these two too close
to tell apart" is arithmetic.

## 3. The split

| Job | Who does it |
|---|---|
| Suggest colours from the category name | The model |
| Is this valid `#rrggbb`? | `PaletteColor.TryParseHex` |
| Can label text be read on the dominant colour? | `PaletteColor.BestTextContrast` ≥ 4.5 (WCAG AA) |
| Does this collide with an existing category? | `PaletteColor.Distance` (redmean) < 70 |
| Keep it, tweak it, or ignore it | The admin |

The model is told **the category name and nothing else** — not the other categories, not their
palettes. The prompt is therefore a constant size no matter how big the table gets, which is what
makes an unmetered endpoint safe.

## 4. The flow

```
POST /api/questioncategories/ai-palette   { "categoryName": "Astronomy" }
  ↓  admin role check (controller)
  ↓  Ai:Enabled kill switch
  ↓  daily + monthly USD budget check      ← before the call, not after
  ↓  CategoryPalettePromptBuilder          ← max 1500 output tokens
  ↓  IQuizAiProvider.CompleteJsonAsync
  ↓  ParseStrict                           ← rejects; never falls back
  ↓  AnnotateAsync                         ← names any category it clashes with
  ↓  one AiGenerationUsage row (success or failure)
  → { candidates: [ { colors, clashesWith }, … ], model }
```

**Nothing in that path writes a category.** Three candidates come back; the admin picks one and
saves it through the normal create/update endpoints, or ignores all three and uses the picker.

### Where the button lives

Inside `color-palette-input.tsx`, directly above the `#1 / #2 / #3` swatch rows — the state it
writes to. It is not wired up by the forms: both the create and the update drawer render the
picker, so both get the proposer, and neither has to remember to pass it anything. It replaced
the "AI Color Assistant" collapsible that used to sit in the same spot (copy a prompt out to
ChatGPT, paste hex codes back).

Applying a candidate calls the picker's own apply handler, which sets the colours **and** the
colour-count select the rows are sized by. Writing only the colours would leave a five-colour
suggestion showing three rows while the form submitted five — the count is user-visible state,
so the click that changes it updates it.

**The button is `aria-disabled`, never `disabled`.** With an empty name it looks and reads as
disabled and its click no-ops, but it stays focusable and hoverable so the `title` tooltip
("Type a category name first") can actually fire. A `disabled` button emits no mouse events, so
the tooltip would never appear and the control could not explain its own state.

## 5. Why three candidates and no regenerate button

A regenerate button forces three questions nobody has a good answer to: how different is
different, do we pass exclusions or raise the temperature, and what stops someone pressing it
fifty times. Returning three at once dissolves all of them — the admin compares side by side,
"another one" is a local click, and there is no second model call to cap.

## 6. Failure is loud

If no candidate survives validation the request fails with a message telling the admin to try
again or pick by hand. It does **not** return the default palette.

The three failures call for three different next steps, so the client shows the server's own
wording rather than one line of its own: *"The AI's answer wasn't usable"* (try again),
*"Today's AI budget is spent"* (pick by hand today), *"AI features are turned off"* (pick by
hand, full stop). They arrive as `AppValidationException` → `ProblemDetails.Title`, and
`paletteErrorMessage` in `api/propose-category-palette.ts` reads them the way the interceptor
does. A 5xx is not shown — that message may be an EF exception — and a network failure falls
back to a generic line.

It appears beside the button, not as a toast: the request sets `skipErrorToast`, because the
failure has a natural home on screen. See
[`../development/error-handling.md`](../development/error-handling.md).

**One of those three is not a failure at all, and is now caught earlier.** "AI features are turned
off" is a standing fact about the server, not something the admin did — so
`GET /api/questioncategories/ai-palette/availability` is called when the picker mounts, and the
button renders disabled with that reason in its tooltip instead of inviting a click that cannot
work. It follows the `aria-disabled`-not-`disabled` rule the button already used for "type a name
first", and for the same reason: a greyed-out control that cannot say why is worse than none.

The budget failure deliberately does **not** move there. It changes under the admin's feet, so a
cached "unavailable" would be wrong within the hour; it stays an inline message on the click. The
split is worth keeping in mind when adding a fourth failure: *standing facts disable the control,
transient ones answer on use.* The endpoint reports configuration only, and an availability check
that fails or has not answered counts as available — a network blip must not grey out a working
button.

This is deliberately the opposite of `parseQuizPalette`'s behaviour, and the difference is the
rule worth remembering: **tolerant when reading what is already stored, strict when accepting
something new.** A stored row that is unreadable must not break a quiz card. A proposal that is
unreadable must not look like a decision someone made.

## 7. Cost

No quota decrement — only admins create categories, and spending a user's daily quiz allowance on
a colour would be a surprise. But *unmetered is not unbounded*:

- 1500 output tokens, versus the generator's 4000. Vendors reserve `max_tokens` up front, so this
  is a real difference rather than a nominal one. At Groq's gpt-oss-120b rates the worst possible
  single call is about $0.0009.
- **It was 300, and 300 is a hang on a reasoning model.** The answer itself is ~60 tokens of
  JSON, so 300 looked generous. But a reasoning model spends its thinking *before* the first
  content token and that thinking counts against `max_tokens` — `openai/gpt-oss-120b` on Groq
  used the whole 300 thinking, returned an empty content channel, and JSON mode rejected the
  empty string as a 400 `json_validate_failed` with `"failed_generation": ""`. Nothing in that
  error mentions thinking or ceilings. The ceiling is now headroom for the thinking, not for the
  answer, and `Ai:ReasoningEffort` keeps the thinking short — the two go together. A
  non-reasoning model needs neither and will emit its 60 tokens and stop.
- The daily and monthly USD caps are checked **before** the call.
- The `Ai:Enabled` kill switch applies — and since
  [`../adr/0004-ai-misconfiguration-disables-the-feature.md`](../adr/0004-ai-misconfiguration-disables-the-feature.md)
  it also carries "the AI configuration is not usable", because `AiConfigurationResolver` forces
  the flag false rather than stopping the app. Nothing here changed to accommodate that, which was
  the point of closing the existing gate instead of adding a new one.
- Every call writes an `AiGenerationUsage` row with `Mode = PaletteProposal`, so its spend is
  visible to the caps above. Quiz-shaped columns on those rows stay at their defaults; filter on
  `Mode` before reading them.

## 8. Testing it without an API key

Set `Ai:Provider` to `"Fake"`. `FakeQuizAiProvider` answers palette prompts with three usable
palettes **and one deliberately unusable one** (two colours, a near-white dominant), so the
validator's drop path is exercised on every run rather than only when a real model misbehaves.
Putting `fail-palette` in the category name returns prose instead of JSON, which exercises the
reject path. `Program.cs` refuses the fake provider in Production.
