# 7. A forbidden lookup is never offered — not to the model, and not by a resolver

Date: 2026-09-10
Status: Accepted

## Context

The seeded **"Unspecified"** row exists for each of the three question lookups. It is an internal
default the app assigns while something is being drafted, and two separate rules say it may not
survive: a *question* may never be **stored** as Unspecified in its category or language
(`QuestionService.ValidateClassificationAsync`), and a *quiz* may not be **published** while any of
its three lookups is Unspecified (`QuizService.EnsurePublishableAsync`). Both are enforced
server-side, and `CategorySelect` / `LanguageSelect` drop the option from every form dropdown so
nobody is offered a dead end. See
[`../quiz/quiz-question-classification.md`](../quiz/quiz-question-classification.md).

An AI-generated quiz nevertheless landed in the builder with Unspecified showing as its category,
selectable, and fatal on submit. Nothing was broken. Three correct mechanisms composed:

| Step | What it did, correctly |
|---|---|
| `use-ai-quiz-draft.tsx` → `buildInput` | Sent the model the lookup names it had: `categories.map(c => c.name)`. **"Unspecified" was in the list**, because the list was the table. |
| `suggestedCategoryId` | Resolved the model's answer by name against that same table. "Unspecified" did not fail to resolve — it resolved *correctly*, to a real id. |
| `CategorySelect` (form mode) | Kept the Unspecified option, because by then the field's value **was** Unspecified, and a Radix `Select` holding a value with no matching `SelectItem` renders a blank trigger over a value that is silently still set. |

So the model was invited to give an answer we had already decided to refuse, the refusal happened
three steps later, in an HTTP 400, and the only affordance the user had was a dropdown that looked
like every other dropdown.

Two things make this worth an ADR rather than a bug fix note. The first is that the obvious fix is
the wrong one: the visible symptom is the select offering the option, and removing the exception
that keeps it there is both easy and actively harmful. The second is that the same shape recurs
wherever a model is handed a vocabulary — this is [ADR 0003](0003-the-model-proposes-the-code-decides.md)
("the model proposes, the code decides") failing in the one place it is easiest to miss, because
the proposal was *valid*, just not *acceptable*.

## Decision

**A vocabulary offered to the model contains only answers we will accept, and a resolver is where
a proposal gets rejected — not only translated.**

Concretely, in `use-ai-quiz-draft.tsx`:

- `buildInput` filters the seeded row out of `categoryNames`, `languageNames` **and**
  `difficultyNames` via `isUnspecifiedLookup`.
- `suggestedCategoryId` and `suggestedLanguageId` refuse it **by name** and return `null`.
- `defaultDifficultyId` excludes it from the median-weight pick.

And, server-side, `AiGenerationService.CleanNames` drops it from every name list on the way into
the prompt.

**Returning `null` is the whole point.** It is not a softer failure; it is a different one.
`canPlaceQuestions` goes false, `needsConfirmation` fires, and `ConfirmDetailsCard` asks for the
one missing field while keeping every generated question. That path was already built for "the
model named a category we don't have" — the decision routes this case into it rather than inventing
a second way to fail.

**Difficulty is included even though an Unspecified difficulty is legal on a question.** The model
is being *asked* to rate difficulty; a shrug is not one of the answers, and it would cost the quiz
its publishability for nothing.

Rejected alternatives:

- **Remove the display exception, so the option can't be shown at all.** This is the fix the
  symptom asks for and it is strictly worse: it trades a bad option for a *blank field over the
  same bad value*. It also does nothing for quizzes stored under Unspecified before these rules
  existed, whose category field would then render empty while still being set. The exception stays;
  the value is stopped from arriving.
- **Let it through and rely on the API's 400.** Already what happened. The message is well written
  and arrives after the user has reviewed twenty questions, and on the manual path an Unspecified
  category fails *every* question POST at once (see `known-issues.md`).
- **Silently substitute something — the first real category, or the user's last choice.** Cheap,
  and it invents a classification nobody chose for content nobody has read. The whole feature is
  built on the user confirming what the model produced.
- **Filter only on the frontend.** The prompt is a server-side contract. A second client, a
  replayed request or a stale bundle would reopen it, so `CleanNames` filters too — belt and
  braces on purpose, and cheap because both are one predicate.
- **Give "Unspecified" a `Hidden`/`IsSystem` flag on the lookup tables.** The principled fix, and
  a migration plus a DTO field plus every read path, to express what one predicate matched by name
  already expresses. Worth revisiting if a second system-default row ever appears; today there is
  exactly one and this would be building a mechanism for a population of one.

The name and the match now live in `QuizAPI.Common.LookupDefaults`. They were a private const in
`QuestionService` and again in `QuizService`, each documented as "kept in sync" with the other; the
third caller is what turned that from untidy into a drift waiting for whoever renames the seeded
row. The frontend counterpart (`UNSPECIFIED_LOOKUP_LABEL`) cannot be shared across the process
boundary and stays paired by documentation.

## Consequences

- **A generation can now require one extra click.** If the model returns "Unspecified" — or nothing
  it can resolve — the user is asked for a category instead of being handed one. That is the
  intended trade: a question asked before the work, rather than an error after it.
- **`ConfirmDetailsCard`'s note had to fork.** *"The AI suggested 'Unspecified', which isn't one of
  your categories"* would be a plain untruth about the user's own data — it **is** one of their
  categories, refused for being a placeholder, not for being unknown. Two messages, one condition,
  and a reminder that "didn't resolve" and "resolved to something forbidden" are different things
  to say out loud even when they take the same code path.
- **Seeing "Unspecified" in a form dropdown is now a signal, not a permission.** The only way it
  appears is the display exception, which means the field already holds it and something upstream
  put it there. Worth treating as a bug report.
- **The submit gate is the backstop, and it is not AI-specific.** `handleQuizSubmit` refuses an
  Unspecified category or language before anything is written, whatever route the value took —
  including a quiz created before these rules existed and edited today. It also implements half of
  the pre-flight check that `known-issues.md` § P2 asks for.
- **Not a role question.** Neither the form filter nor either API gate consults the user's role, so
  an Admin or SuperAdmin gets exactly the same refusal. `useCanSelectUnspecifiedLookup` gates
  **filter** dropdowns only, where filtering *by* Unspecified is how an admin finds the rows that
  still need classifying. Curating the catalogue is a reason to *find* these rows, never to
  *create* one.
- **The general lesson, and it is the same one as ADR 0006:** every stage transmitted its input
  faithfully and the result was still wrong, because no stage owned the property that mattered —
  here, "may this value be assigned?". A list handed to a model is not neutral data. It is a
  promise to accept anything in it.
