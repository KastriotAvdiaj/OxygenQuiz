# Question bank — staff make questions public, everyone else keeps theirs

Every saved question lives in the question bank and can be reused across quizzes. This doc covers
who may make a question readable by everyone — a **public question** (`Visibility = Public`) — and
what a question is when nobody says. Classification (category, language, difficulty) is in
[`quiz-question-classification.md`](./quiz-question-classification.md); how a question inside a
quiz is readable to that quiz's players is in [`quiz-visibility.md`](./quiz-visibility.md).

> **Status: implemented (2026-11-08)** on branch `question-bank-rules-and-image-import`. Before
> it, any signed-in user could create or edit a question into the public part of the bank, and two of the
> three create endpoints fell back to `Global` when no visibility was sent. On 2026-11-10 `Global`
> was renamed `Public` (stored as the same number, so no migration); `"Global"` is still accepted on
> input, for old clients and import files.

## The rules

| Who / where | A new question is | Can choose Public? |
|---|---|---|
| Admin, SuperAdmin on the Questions page | `Public` by default, every time — not carried from the last save in a batch | Yes, with the visibility select |
| Anyone else on the Questions page | `Private`; the select isn't shown | No — the API answers 403 |
| The quiz builder (everyone) | `Private` (`DEFAULT_NEW_*` in `constants.ts`) | No |
| The AI import (everyone) | `Private` (`QuizService.BuildAiQuestionEntity`) | No |
| The data-transfer importer (staff only) | the row's `Visibility`, `Public` when blank | Yes |
| No value, or one that isn't `Public`/`Private`/`Global` (`"Shared"`, `"1"`) | `Private` | — |

- **An edit may make a question private, never public** — unless the editor is staff.
  Leaving an already-public question public is not a change, so a question a user shared before
  this rule existed stays editable by its owner without a 403.
- **The gate is the API.** `QuestionService.ResolveNewVisibility` and `ApplyVisibilityChange`
  enforce it, with `canShare` decided by the controller (`ICurrentUserService.IsAdmin`), per the
  "permission checks in the controller" rule. The client's `useCanShareQuestions`
  (`Entities/select-visibility.tsx`) only decides whether to draw the select. Tests:
  `QuizAPI.Tests/Questions/PublicQuestionVisibilityTests.cs`.

## Picking — your own questions and Public ones, for everyone

> **Status: implemented (2026-11-10).**

The quiz builder's *Choose questions* dialog has two tabs, **Your questions** (opens first) and
**Public questions**. Nobody can put someone else's private question in a quiz — admins included,
for whom it would be a privacy breach.

| Where | What it returns |
|---|---|
| `GET /questions/mine/{type}/search` | the caller's own |
| `GET /questions/public/{type}/search` | Public questions only, to everyone |
| `GET /questions/{type}/search` ("all") | everything to an admin (the Questions page — moderation); the caller's own plus Public ones to anyone else |
| Quiz create, update, AI import | refuse (403) any question they would **add** that is neither the caller's own nor Public — `IQuizRepository.AllQuestionsAttachableAsync` |

- **Explicit clamps, not the query filter.** The `QuestionBase` filter decides who may *read* a
  question: admins read everything, and anyone reads a question inside a quiz they may play. Neither
  is a licence to reuse one, so `QuestionService.Clamp` and the attach check spell the rule out.
- **Only what a save adds is checked.** An admin editing someone's quiz keeps that quiz's private
  questions — the admin couldn't have added them, and doesn't need to.
- **Editing a picked question you don't own edits a copy** for your quiz only — unchanged
  ([ADR 0030](../adr/0030-the-builder-edits-a-saved-question-as-a-copy.md)).
- Tests: `QuizAPI.Tests/Questions/PickingScopeTests.cs`.

Before this, the picker read the "all" endpoint for everyone, so a user saw — and could add — other
people's private questions that sat inside a public quiz; its `visibility: "Public"` filter, meant
to stop that in May 2025, never reached the server.

## Why the fallback is Private, not Public

A `Public` question is readable by every caller, guests included — rule 3 of the `QuestionBase`
query filter in `ApplicationDbContext`. A missing or misspelled value is a client bug, and a bug
should fail towards showing nobody, not everybody. The quiz builder already sent `"Private"`; the
question picker once sent `visibility: "Public"` while the enum still said `Global` — the kind of
mistake a public fallback turns into a leak.

## Why only staff make questions public

The public questions are meant to become the stock the catalogue and the AI draw on, so what goes in
has to be something someone answers for. A per-user "make public" switch would fill them with drafts,
duplicates and unreviewed answers that every other author then sees. Users still reuse their own
questions across their own quizzes; letting users make questions public, with review, is a later
decision.
