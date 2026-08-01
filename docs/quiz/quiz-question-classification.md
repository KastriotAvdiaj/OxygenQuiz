# Quiz question classification

How a question authored inside the quiz builder gets its **category**, **language** and
**difficulty**, and why the seeded **"Unspecified"** lookup is hidden from most users.

## The rule

A quiz and the questions created inside it share one classification:

- **Category and language are inherited from the quiz.** A new question does not have its own
  category/language pickers in the builder — it takes the quiz's. This keeps a quiz and its
  questions filed consistently and means the question bank never accumulates mystery entries.
- **Difficulty is left Unspecified.** A quiz mixes questions of varying difficulty, so each
  question's difficulty is set on its own later (or left Unspecified). The builder never forces
  a quiz-wide difficulty onto its questions.

## No question may be stored as Unspecified

**Category and language are required on every question, however it was created.** "Unspecified" is
an internal default the app assigns while a question is being drafted — it must never be what a
question is *persisted* as. A question filed under Unspecified is invisible to category and language
filters, so it can't be found again in the bank; enough of them and the bank stops being usable.

**Difficulty is exempt** and may stay Unspecified indefinitely: it genuinely isn't known until
someone rates the question, and nothing depends on it being set.

Enforced in two places, deliberately:

| Layer | What it does |
|---|---|
| **API** (`QuestionService.ValidateClassificationAsync`) | The gate. Runs on all three create and all three update paths; throws `AppValidationException` → **400**. `QuizService`'s AI import runs the same check against the *quiz's* category/language, since its questions inherit them. |
| **Client** (the three `create*QuestionInputSchema` zod schemas) | Fast feedback in the form. Category and language are required (`.positive()`, no default); difficulty still defaults to `UnspecifiedIds.difficultyId`. |

The rule is matched **by name**, case-insensitively — not by id. The seeded rows aren't guaranteed
to land on the same ids in every environment, which is the same reason
`lookup-visibility.ts` matches by label on the frontend. Server-side the constant lives in
`QuestionService.UnspecifiedLookupName` (and a twin in `QuizService`).

> **Existing data is untouched.** The rule applies to writes from this point on; questions already
> stored as Unspecified keep working and still play. They will, however, have to be given a real
> category and language the next time someone edits them — the update path validates too.

This mirrors the AI flow, whose invariant #2 already states "category and language are always
inherited from the quiz, never `Unspecified`" — see
[ai-quiz-architecture.md](ai-quiz-architecture.md). Manual and AI creation now classify their
questions the same way.

## Where it happens

| Flow | Mechanism |
|------|-----------|
| **Manual** | Each new (negative-id) question is its own POST to the shared per-type endpoint — the builder uses the *same* hooks and endpoints as the standalone question pages, fired concurrently via `Promise.all`, then one further call creates the quiz. At save time each question is passed through `inheritQuizClassification(question, values)` (`src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/inherit-quiz-classification.ts`), which overwrites `categoryId`/`languageId` with the quiz's values and leaves `difficultyId` untouched. Because the endpoint is shared, the *inheritance* rule lives entirely in this caller — the endpoint only enforces "not Unspecified". |
| **AI** | Category and language live only at the quiz level of the `/quiz/ai-import` payload; each question carries just a `difficultyId`. The backend applies the quiz's category/language to every created question. |

Inheritance is applied **at save time**, not when the question is added. The quiz is the single
source of truth, so this is correct even if the quiz's category or language changed after the
question was authored.

New questions still start from the seeded "Unspecified" ids (`UnspecifiedIds` in the builder's
`constants.ts`) as a safe default; category and language are simply overwritten before the
question is persisted.

## Hiding the "Unspecified" lookup

The backend seeds an "Unspecified" row for each lookup — category, difficulty and language (see
`OxygenBackend/QuizAPI/Services/DbSeeder.cs`). It is an internal default the app assigns
automatically, not a meaningful choice for an end user.

`src/pages/Dashboard/Pages/Question/Entities/lookup-visibility.ts` centralises this:

- `isUnspecifiedLookup(label)` — matches the row **by name** (case-insensitive), not a hard-coded
  id, so it stays correct regardless of row ordering across environments.
- `useCanSelectUnspecifiedLookup()` — returns `true` only for `Admin` / `SuperAdmin`.

The shared `CategorySelect`, `DifficultySelect` and `LanguageSelect` components use these to drop
the "Unspecified" option from their dropdowns for everyone except catalog admins (who still need
it to curate content). This applies in both the form and filter variants. Hiding the option is
purely a selection concern — it never changes a value already stored on a question or quiz.

> **Known rough edge.** `useCanSelectUnspecifiedLookup` still offers "Unspecified" to admins in the
> *question* category/language dropdowns, but the API now rejects it there. An admin who picks it
> gets a clear 400 rather than a disabled option. Filtering it out of the question forms for
> everyone (while keeping it in the filter variants and for difficulty) would close the gap; it
> wasn't done here because those selects are shared with the quiz form and the filter bars.
