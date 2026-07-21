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

This mirrors the AI flow, whose invariant #2 already states "category and language are always
inherited from the quiz, never `Unspecified`" — see
[ai-quiz-architecture.md](ai-quiz-architecture.md). Manual and AI creation now classify their
questions the same way.

## Where it happens

| Flow | Mechanism |
|------|-----------|
| **Manual** | New (negative-id) questions are created one request at a time. At save time each is passed through `inheritQuizClassification(question, values)` (`src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/inherit-quiz-classification.ts`), which overwrites `categoryId`/`languageId` with the quiz's values and leaves `difficultyId` untouched. |
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
