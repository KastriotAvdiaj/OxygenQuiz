# Question bank — staff share questions, everyone else keeps theirs

Every saved question lives in the question bank and can be reused across quizzes. This doc covers
who may make a question readable by everyone — a **shared question** (`Visibility = Global`) — and
what a question is when nobody says. Classification (category, language, difficulty) is in
[`quiz-question-classification.md`](./quiz-question-classification.md); how a question inside a
quiz is readable to that quiz's players is in [`quiz-visibility.md`](./quiz-visibility.md).

> **Status: implemented (2026-11-08)** on branch `question-bank-rules-and-image-import`. Before
> it, any signed-in user could create or edit a question into the shared bank, and two of the
> three create endpoints fell back to `Global` when no visibility was sent.

## The rules

| Who / where | A new question is | Can choose Global? |
|---|---|---|
| Admin, SuperAdmin on the Questions page | `Global` by default, every time — not carried from the last save in a batch | Yes, with the visibility select |
| Anyone else on the Questions page | `Private`; the select isn't shown | No — the API answers 403 |
| The quiz builder (everyone) | `Private` (`DEFAULT_NEW_*` in `constants.ts`) | No |
| The AI import (everyone) | `Private` (`QuizService.BuildAiQuestionEntity`) | No |
| The data-transfer importer (staff only) | the row's `Visibility`, `Global` when blank | Yes |
| No value, or one that isn't `Global`/`Private` (`"Public"`, `"1"`) | `Private` | — |

- **An edit may take a question out of the bank, never put one in** — unless the editor is staff.
  Leaving an already-shared question shared is not a change, so a question a user shared before
  this rule existed stays editable by its owner without a 403.
- **The gate is the API.** `QuestionService.ResolveNewVisibility` and `ApplyVisibilityChange`
  enforce it, with `canShare` decided by the controller (`ICurrentUserService.IsAdmin`), per the
  "permission checks in the controller" rule. The client's `useCanShareQuestions`
  (`Entities/select-visibility.tsx`) only decides whether to draw the select. Tests:
  `QuizAPI.Tests/Questions/SharedBankVisibilityTests.cs`.

## Why the fallback is Private, not Global

A `Global` question is readable by every caller, guests included — rule 3 of the `QuestionBase`
query filter in `ApplicationDbContext`. A missing or misspelled value is a client bug, and a bug
should fail towards showing nobody, not everybody. The quiz builder already sent `"Private"`; the
question picker sent `visibility: "Public"`, a value the enum doesn't have, which is the kind of
mistake a `Global` fallback turns into a leak.

## Why only staff share

The shared bank is meant to become the stock the catalogue and the AI draw on, so what goes in
has to be something someone answers for. A per-user "share" switch would fill it with drafts,
duplicates and unreviewed answers that every other author then sees. Users still reuse their own
questions across their own quizzes; opening the shared bank to users, with review, is a later
decision.
