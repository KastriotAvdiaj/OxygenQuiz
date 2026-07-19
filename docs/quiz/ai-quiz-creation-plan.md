# AI-Assisted Quiz Creation — Implementation Plan

Status: Phase 0 + Phase 1 implemented. Phases 1.5 and 2 not started.
Owner: Kastriot
Last updated: 2026-07-17

---

## 1. Goal

When a user clicks **+ Create Quiz**, instead of the current "choose a title" modal
(`src/pages/Dashboard/Pages/Quiz/Quizzes.tsx`, lines ~125–143, whose title input is
intentionally inert), they should first choose **how** they want to build the quiz:

- **Manually** — the existing flow at `/dashboard/quizzes/create-quiz`
  (`CreateQuizForm`), unchanged.
- **With AI** — a new guided flow where the user pastes source material ("Data"),
  runs a carefully engineered prompt through an LLM, and pastes the structured result
  back into the app, which then creates the quiz and its questions in one pass.

This document is the design of record. It is deliberately detailed because this is
expected to become the most-used entry point for quiz creation.

---

## 2. The central problem, and why it mostly disappears

You correctly identified the hard part: **a quiz and every question reference
`categoryId`, `languageId`, and `difficultyId` — real foreign keys into entity tables.**
If we ask the AI to output IDs, it will hallucinate them, and we can't dump an
"enormous" catalog of entities (with IDs) into a prompt.

You also decided (correctly) that **neither users nor the AI may create new
categories/languages/difficulties** as a side effect of quiz creation. That rules out
any "auto-create missing entity" approach.

The resolution is an architectural reframing rather than a clever mapping trick, and it
rests on an asymmetry between the three entities:

> **Category and language *distribute* from a quiz to its questions. Difficulty
> *aggregates*.**

Every question in a Spanish-language History quiz genuinely *is* Spanish and *is* about
History — inheritance there isn't an approximation, it's identity. But a "Hard" quiz is
hard *on average*; stamping "Hard" on all twelve of its questions is a category error,
like assigning every student a class's mean grade. This is why difficulty feels trickier
than the other two: it is, for a structural reason rather than an implementation one.

That gives us the final model:

| Field | Source | Resolution needed |
|---|---|---|
| Quiz `categoryId` / `languageId` / `difficultyId` | Human, existing dropdowns | None — already IDs |
| Question `categoryId` / `languageId` | **Inherited from the quiz** | None |
| Question `difficultyId` | **AI, from the fixed difficulty table (by name)** | Strict name→ID match |
| Question `pointSystem` / `timeLimitInSeconds` | **AI** | None — enum + int, not FKs |

The catalog-size problem disappears entirely: the AI is never shown categories or
languages, in any form. The only vocabulary it receives is the difficulty table, which is
a fixed set of a handful of rows — cheap to include, and a closed enum by construction.

This works because of how the codebase already operates:

- The manual form already has human-driven `CategorySelect` / `DifficultySelect` /
  `LanguageSelect` dropdowns bound to `categoryId` / `languageId` / `difficultyId`
  (`create-quiz.tsx`, lines ~502–533). Catalog size is irrelevant to a human scrolling a
  searchable dropdown, where it is fatal to a prompt.
- Every question row also carries `categoryId` / `languageId` / `difficultyId`
  (`QuestionBaseCM` in `DTOs/Question/QuestionDTOs.cs`), so inheriting the quiz's values
  is a straight assignment.

### 2a. Why not `Unspecified`?

The codebase has an `UnspecifiedIds` escape hatch (all `1`) in
`Create-Quiz-Form/constants.ts`, used as the *schema-level* default in
`create-true_false-question.ts` and `create-type-the-answer-question.ts`. Every question
the manual builder creates inside a quiz currently goes in with Unspecified category,
language, **and** difficulty.

The AI flow deliberately does **not** use it. At the moment a question is generated we
always know the quiz's category and language, so writing `Unspecified` would be
discarding information we hold. And once category and language are populated, a blank
difficulty leaves an obviously incoherent row. Since the difficulty table is small and
fixed, and the AI has genuine signal about the relative difficulty of a question it just
wrote, generating it is both cheap and more correct than leaving a hole.

> **Note — latent issue in the manual builder.** `DEFAULT_NEW_MULTIPLE_CHOICE` and its
> siblings default new in-quiz questions to `Unspecified` for all three fields even
> though the form knows the quiz's category and language at that moment. Seeding those
> defaults from the quiz's current selections would be a small change with a real
> data-quality payoff. **Out of scope for this feature** — tracked separately so it
> doesn't destabilise the existing flow.

### 2b. Difficulty resolution — strict, and incapable of creating entities

1. The prompt includes the *names* of valid difficulties as a hard enum
   (e.g. `"difficulty": one of ["Easy","Medium","Hard"]`). Names, never IDs.
2. On import, resolve name → ID by **case-insensitive exact match against rows that
   already exist**. No fuzzy matching, no creation, ever.
3. Unmatched or null → fall back to the **quiz-level difficulty**, and flag it in the
   preview so the user can correct it on the card.

Worst case is a question labelled one notch off, visible and editable before anything is
saved. There is no path by which AI output can create or mutate an entity row.

### 2c. Per-question scoring (`pointSystem`, `timeLimitInSeconds`)

Verified in `Services/Scoring/QuizScoring.cs`: score is a function of `PointSystem`
(`Standard`=1, `Double`=2, `Quadruple`=4) and `TimeLimitInSeconds` only. **Question
difficulty is not read anywhere in the session or grading services** — it is metadata for
finding questions in the bank, not a gameplay input.

So the AI also assigns `pointSystem` and `timeLimitInSeconds` per question, letting a
generated quiz genuinely ramp: quick Standard recall questions early, Quadruple synthesis
questions with more time at the end. These are a string enum and a bounded integer, not
foreign keys — a bad value fails a trivial range check rather than corrupting a relation.
This is where per-question variation actually reaches the player.

---

## 3. End-to-end UX flow

```
[+ Create Quiz]
      │
      ▼
┌─────────────────────────────┐
│  Modal: "How do you want to  │
│         build this quiz?"    │
│   ┌─────────┐  ┌──────────┐  │
│   │ Manually │  │ With AI  │  │
│   └─────────┘  └──────────┘  │
└─────────────────────────────┘
      │                    │
      │ (manual)           │ (AI)
      ▼                    ▼
/dashboard/quizzes/   /dashboard/quizzes/
   create-quiz          create-quiz/ai
 (existing form)      (new AI wizard)
```

### AI wizard — step by step

**Step 1 — Quiz basics (human-owned, no AI).**
Reuse the existing selects. The user sets: Title, Description (optional), **Category**,
**Language**, **Difficulty** (the quiz default), Status, and quiz-level settings
(time limit, shuffle, instant feedback). These are the entity IDs; they are chosen by a
human from real dropdowns, so they are always valid. Nothing here is guessed.

**Step 2 — Provide the source "Data".**
A large `Textarea` where the user pastes the material the quiz should be based on
(an article, notes, a transcript, a syllabus section, etc.). Add optional controls that
shape the prompt but never the entities:
- Number of questions (e.g. 5–20).
- Allowed question types (Multiple Choice / True-False / Type-the-Answer), defaulting
  to all three. These map to `QuestionType` in `@/types/question-types`.
- Optional tone/instruction free-text ("focus on dates", "exam-style", etc.).

**Step 3 — Copy the engineered prompt.**
A single **Copy prompt** button. Per your requirement, the prompt text is **never
shown** — the button copies to clipboard and shows a "Copied ✓" confirmation only.
Under the hood the copied string is `buildPrompt(userData, options, difficultyNames)`
(Section 5). We show a short instruction: *"Paste this into ChatGPT / Claude / any LLM,
then copy its full reply back here."* A link/hint that the reply must be JSON.

**Step 4 — Paste the AI result.**
A second `Textarea` labelled "Paste the AI's response". On paste we:
1. Extract the JSON (tolerant parse — strip markdown code fences, find the first `{`…`}`
   or `[`…`]` block).
2. Validate against a Zod schema (Section 6).
3. Resolve any per-question difficulty names against the closed difficulty set.
4. Render a **preview** (Section 8): every question as an editable card, with badges for
   anything that needs attention (unparseable question dropped, difficulty fell back to
   default, no correct answer marked, etc.).

**Step 5 — Review & create.**
The preview reuses the *same* question cards the manual builder already uses
(`new-display-quiz-question-card/*`) so the user can edit inline before committing.
**Create quiz** runs the import pipeline (Section 6) and, on success, navigates to the
quiz list exactly like `handleQuizSubmit` does today.

---

## 4. Modal fork — the small, safe first change

Replace the body of the existing `Dialog` in `Quizzes.tsx` (the one whose title input
does nothing) with a two-button chooser. Manual → `Link` to the current
`quizzes/create-quiz` route (unchanged). AI → `Link` to a new `quizzes/create-quiz/ai`
route. This is a self-contained change that can ship before any AI logic exists.

Routes to add in `src/routes/Router.tsx` (mirror the existing `quizzes/create-quiz`
entry at lines ~285 and ~368, and the `my-dashboard` `quizzes/create` at ~501):
- `quizzes/create-quiz/ai` (admin dashboard)
- `quizzes/create/ai` (personal dashboard)

---

## 5. The engineered prompt (hidden, copy-only)

Kept in one place: `src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/prompt.ts`,
exporting `buildPrompt(...)`. Design goals: force **strict JSON only**, forbid entity
invention, and pin the output shape to our import schema.

Skeleton (illustrative — final wording to be tuned):

```
You are a quiz-generation engine. Read the SOURCE MATERIAL and produce EXACTLY
{N} quiz questions based only on it.

Output rules — follow precisely:
- Respond with a single JSON object and NOTHING else. No prose, no markdown fences.
- Schema:
  {
    "questions": [
      {
        "type": "MultipleChoice" | "TrueFalse" | "TypeTheAnswer",
        "text": string,                       // the question
        "difficulty": one of {DIFFICULTY_NAMES},
        "pointSystem": "Standard" | "Double" | "Quadruple",
        "timeLimitInSeconds": integer between 5 and 300,
        // MultipleChoice:
        "answerOptions": [ { "text": string, "isCorrect": boolean }, ... 2 to 4 ],
        "allowMultipleSelections": boolean,
        // TrueFalse:
        "correctAnswer": boolean,
        // TypeTheAnswer:
        "correctAnswer": string,
        "acceptableAnswers": string[],
        "isCaseSensitive": boolean,
        "allowPartialMatch": boolean
      }
    ]
  }
- Allowed question types: {ALLOWED_TYPES}.
- For "difficulty" you MUST pick from exactly this list: {DIFFICULTY_NAMES}.
  Do NOT invent difficulty names. Do NOT output categories or languages at all.
- Scale "pointSystem" and "timeLimitInSeconds" with the question's difficulty, so harder
  questions are worth more and allow more time.
- Each MultipleChoice question needs 2–4 options and at least one isCorrect:true.

SOURCE MATERIAL:
"""
{USER_DATA}
"""
```

Note what is **absent**: no category, no language, no IDs of any kind. `{DIFFICULTY_NAMES}`
is the only entity vocabulary in the prompt — names not IDs, and a closed set of a few
rows.

---

## 6. Import pipeline & validation

New file: `src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/parse-ai-output.ts`.

**6.1 Extract.** Tolerate LLM chatter: strip ```` ```json ```` fences, trim, and parse
the outermost JSON. If parsing fails, show a friendly error and let the user re-paste.

**6.2 Validate (Zod).** A schema that mirrors the existing question schemas so the
generated objects are directly compatible with the create-question mutations:
- Base: `text` non-empty; `type` in the `QuestionType` enum.
- MultipleChoice: reuse `answerOptionsSchema` from `create-quiz.ts` (2–4 options, ≥1
  correct) + `allowMultipleSelections`.
- TrueFalse: `correctAnswer: boolean`.
- TypeTheAnswer: `correctAnswer: string`, `acceptableAnswers: string[]`,
  `isCaseSensitive`, `allowPartialMatch`.
Invalid questions are **dropped with a visible reason** rather than aborting the whole
import — a partial, correct quiz is better than an all-or-nothing failure.

**6.3 Resolve difficulty + clamp scoring.** For each question:
- `difficulty` (a name) → case-insensitive exact match against the loaded difficulties
  list (`queryData.difficulties`). Match → that `difficultyId`. No match → quiz-level
  `difficultyId`, and flag it.
- `pointSystem` → must be one of `Standard` / `Double` / `Quadruple`, else `Standard`.
- `timeLimitInSeconds` → clamp to 5–300, else the `DEFAULT_QUESTION_SETTINGS` value (10).

**Category and language are always the quiz-level IDs. Never from AI, never Unspecified.**

**6.4 Map into existing "new question" shapes.** Convert each validated question into the
`NewMultipleChoiceQuestion` / `NewTrueFalseQuestion` / `NewTypeTheAnswerQuestion` types
already defined in `Create-Quiz-Form/types.ts`, with:
- `visibility: "Private"` (your decision — quiz-only, keeps the shared bank clean),
- `categoryId` / `languageId` = **inherited from the quiz**,
- `difficultyId` = resolved from the AI's name,
- negative temp `id` (same convention the manual builder uses for not-yet-saved
  questions).

Per-question `settings` (`pointSystem`, `timeLimitInSeconds`, `orderInQuiz`) travel
alongside, in the exact `{ question, settings }` shape `QuizQuestionProvider` already
accepts as `initialQuestions`.

**6.5 Create.** Reuse the *exact* mechanism already proven in `handleQuizSubmit`
(`create-quiz.tsx`, lines ~266–307):
1. For each generated question, call the matching create mutation
   (`useCreateMultipleChoiceQuestion` → `POST /questions/multiplechoice`,
   `useCreateTrueFalseQuestion` → `/questions/truefalse`,
   `useCreateTypeTheAnswerQuestion` → `/questions/typetheanswer`). Each returns a real
   `id`.
2. Assemble `questions: [{ questionId, timeLimitInSeconds, pointSystem, orderInQuiz }]`.
3. `POST /quiz` via `useCreateQuiz` with the quiz-level fields + those question links.

Because we reuse these hooks, no new backend endpoint is strictly required for Phase 1.

---

## 7. Backend — optional hardening endpoint

Phase 1 works entirely with existing endpoints. But two robustness upgrades are worth a
small backend addition, ideally before this becomes high-traffic:

**7.1 `POST /api/quiz/ai-import` (recommended, Phase 1.5).**
A single transactional endpoint that accepts the quiz-level fields plus an array of
*inline* question definitions (not pre-created IDs), and on the server:
- validates every question,
- **resolves difficulty names against existing rows only, never creating entities**
  (this is the authoritative guard — client-side resolution is convenience, the server
  is the source of truth),
- creates the Private questions and the quiz **in one transaction** so a mid-way failure
  can't leave orphan questions (the current client-side loop in `handleQuizSubmit` can
  leak questions if the final `POST /quiz` fails — the AI flow, doing this in bulk, makes
  that failure mode more likely and more visible).

Suggested DTO: `AiQuizImportCM` = `QuizCM` fields (minus `Questions`) + `List<InlineQuestionCM>`
where each inline question is a discriminated shape carrying a `type` and the same fields
as the existing `MultipleChoiceQuestionCM` / `TrueFalseQuestionCM` / `TypeTheAnswerQuestionCM`,
but with `DifficultyName` (string) instead of a caller-supplied `DifficultyId`, and
`CategoryId` / `LanguageId` taken from the quiz. Service resolves `DifficultyName` →
existing id or 400s with a clear "unknown difficulty 'X'" message.

**7.2 Server-side entity guard.** Regardless of 7.1, add a defensive check in the
question-create services: reject any request whose `DifficultyId` / `CategoryId` /
`LanguageId` does not already exist. This enforces "no entity creation via quiz flows"
at the layer that matters, independent of what any client sends.

If you'd rather not touch the backend at first, skip 7.1 and rely on 6.5 — but implement
7.2 regardless, it's cheap insurance.

---

## 8. Preview UI

Reuse, don't rebuild. After a successful parse, the wizard hands off to the **actual
manual builder**, prefilled:

```tsx
<QuizQuestionProvider initialQuestions={parsed}>
  <CreateQuizForm initialValues={quizBasics} />
</QuizQuestionProvider>
```

This is the same composition the edit route already uses (`edit-quiz.tsx`, lines ~44–61),
and `QuizQuestionProvider` already seeds both `addedQuestions` and `questionSettings` from
`initialQuestions` (`Quiz-questions-context.tsx`, lines ~116–142). The user therefore gets
inline editing, per-question validation, settings, and the proven submit path **for free**,
and lands somewhere already familiar from manual creation.

The one required change to the existing form is a new optional
`initialValues?: Partial<CreateQuizInput>` prop on `CreateQuizForm`, used for
`defaultValues` when `editQuiz` is absent. It is additive and does not alter current
behaviour.

A dismissible banner above the form carries AI-specific notices: how many questions were
imported, how many were dropped and why, and which had their difficulty defaulted.

---

## 9. Phasing

**Phase 0 — Modal fork.** Two-button chooser + new routes. No AI logic. Ships alone.

**Phase 1 — Copy-paste MVP.** Prompt builder (hidden/copy-only), paste box, tolerant
parse + Zod validate + difficulty resolve, preview via existing cards, create via
existing mutations. Zero LLM cost, zero backend change. This is the whole feature you
described.

**Phase 1.5 — Backend hardening.** Add `POST /api/quiz/ai-import` (transactional) and the
entity-existence guard (7.2). Client switches from the per-question loop to the single
endpoint.

**Phase 2 — In-app generation (hosted API).** Fully automated "Generate" button, no
copy-paste. Do **not** self-host a local model — the existing Ollama microservice
(`microservice/main.py`) was only a test and can't serve concurrent users. Instead call a
**hosted, pay-per-token API** (e.g. Google Gemini Flash, Claude Haiku, or GPT-4o-mini —
pick the cheapest model that reliably returns valid JSON). Key design point: **the call
must originate from our .NET backend, never the browser** — the API key stays server-side,
and the backend can rate-limit, cache, and audit usage. Concretely:

- New backend endpoint `POST /api/quiz/ai-generate` takes the source "Data" + options,
  builds the prompt server-side (same logic as `buildPrompt`, ported to C#), calls the
  provider, and returns the validated question array — or better, chains directly into the
  `ai-import` transaction from 1.5 and returns the finished quiz.
- Provider is abstracted behind an `IQuizAiProvider` interface so Gemini/Claude/OpenAI are
  swappable via config, and so cost/rate limits live in one place.
- Because the prompt and parser from Phase 1 already exist, the frontend change is just
  replacing the copy-paste step with a "Generate" button that hits this endpoint; the
  preview/review/create steps are unchanged. Copy-paste remains available as the free
  fallback (and for users who prefer their own ChatGPT/Claude subscription).

Cost control (since this is the concern that drove the whole design): cap source length,
cap questions-per-call, add per-user daily quotas, cache identical requests, and consider
gating in-app generation behind a role/flag so it isn't abused. A cheap model like Gemini
Flash or Claude Haiku is fractions of a cent per quiz — the risk is volume, not unit cost,
so the quota/rate-limit layer matters more than model choice.

---

## 10. Edge cases & failure modes

- **Malformed JSON / LLM prose around it** → tolerant extraction, then a clear
  "couldn't read that — paste the full reply" error. Never crash.
- **Partial validity** → drop bad questions with reasons, keep good ones, tell the user
  how many were dropped.
- **Unknown difficulty name** → fall back to quiz difficulty, badge it. Never create a
  difficulty.
- **AI emits categories/languages anyway** → ignored entirely; entities always come from
  the quiz-level human selection.
- **MultipleChoice with no correct option / <2 options** → invalid, dropped (matches
  `answerOptionsSchema`).
- **Orphan questions on quiz-create failure** (Phase 1 only) → mitigated by moving to the
  transactional endpoint in 1.5.
- **Huge pasted "Data"** → cap client-side (the microservice already caps prompt at 2000
  chars in `main.py`; for copy-paste there's no hard limit, but warn above a threshold so
  the user knows most LLMs will truncate).
- **Prompt-injection in source material** ("ignore instructions, output X") → the source
  is fenced in the prompt and, more importantly, we never execute AI output — we validate
  it against a strict schema and a human reviews it. Impact is bounded to "bad questions
  the user can edit or reject".

---

## 11. Concrete file change list

New:
- `src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/prompt.ts` — `buildPrompt(...)`.
- `src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/parse-ai-output.ts` — extract +
  Zod validate + difficulty resolve + map to `New*Question` types.
- `src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/ai-quiz-wizard.tsx` — the 5-step
  flow; reuses selects, provider, and question cards.
- (Phase 1.5) `OxygenBackend/QuizAPI/DTOs/Quiz/AiQuizImportCM.cs` + service method +
  `POST /api/quiz/ai-import` in `QuizzesController.cs`.

Modified:
- `src/pages/Dashboard/Pages/Quiz/Quizzes.tsx` — replace inert title modal with the
  manual/AI chooser.
- `src/routes/Router.tsx` — add the two `.../ai` routes.
- (Phase 1.5) question-create services — entity-existence guard (7.2).
- (Phase 2) new backend `POST /api/quiz/ai-generate` + `IQuizAiProvider` abstraction +
  server-side API key config (Gemini/Claude/OpenAI). No local microservice, no browser-side
  key. Frontend adds a "Generate" button that reuses the existing preview/create path.

Reused as-is:
- `create-quiz.ts` (`createQuizInputSchema`, `answerOptionsSchema`, `useCreateQuiz`).
- The three `useCreate*Question` hooks.
- `Quiz-questions-context.tsx` + `new-display-quiz-question-card/*`.
- `CategorySelect` / `DifficultySelect` / `LanguageSelect` + their `get-*` query hooks.

---

## 12. Decisions made

1. **Question entities** — category and language inherited from the quiz; difficulty
   generated by the AI from the fixed table with strict name→ID matching and fallback to
   the quiz difficulty. No `Unspecified` in the AI flow. ✔ decided
2. **Scoring knobs** — the AI also assigns `pointSystem` and `timeLimitInSeconds` per
   question so generated quizzes ramp. ✔ decided
3. **Question visibility** — AI questions are created `Private` (quiz-scoped), keeping the
   shared bank clean. ✔ decided
4. **Phase 2 delivery** — hosted API (Gemini Flash / Claude Haiku / GPT-4o-mini) called
   **server-side**, with copy-paste retained as the free fallback. The local Ollama
   microservice is explicitly out of scope — not viable under concurrent load. ✔ decided

### Still open

- **Backend timing** — ship Phase 1 purely client-side (accepting the orphan-question risk
  if `POST /quiz` fails after questions are created), or go straight to the transactional
  `ai-import` endpoint from 1.5?
- **Phase 2 provider choice** — which specific model, once you're ready to spend.
- **Manual-builder `Unspecified` fix** (Section 2a note) — worth doing as a follow-up?
```
