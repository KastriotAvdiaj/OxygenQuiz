# Proposal: screenshot import, pasted questions, and who may pick which questions

**Status: accepted 2026-11-10, not yet built.** Decided in one design session (2026-11-08 to 11-10);
built in the three phases of §5. Folds into `docs/quiz/` and is deleted when the last phase ships.

An admin has twelve screenshots of a quiz show and a worksheet photo, and wants their questions in
the bank by tonight. Typing them out is the slow part. A regular user has a list of questions they
brainstormed with their own AI and wants them in a quiz without retyping each one. Meanwhile the
quiz builder's picker shows a regular user other people's private questions, because they sit
inside a public quiz. This records what was decided for all three.

---

## 1. What happens today

- **The bank's public/private split was a grey area** until 2026-11-08: anyone could make a question
  `Global`, and two create endpoints fell back to it. Fixed on this branch —
  [`../quiz/question-bank.md`](../quiz/question-bank.md).
- **The picker reads every question the caller can see.** `QuestionTabContent` defaults to
  `scope = "all"` (`/questions/{type}/search`), and the `QuestionBase` query filter
  (`ApplicationDbContext`) lets a caller see their own questions, every `Global` one, **and any
  question inside a quiz they may see** — rule 4. So a user's picker offers other people's private
  questions from public quizzes, and an admin's offers everything (rule 1). The picker's
  `visibility: "Public"` meant to prevent this (May 2025, "Only public questions for selection") but
  never worked: the enum has no `Public`, and `toFilterQuery` drops the field.
- **Normal users get no AI help at all**, including the copy-paste own-AI path. The pasted-reply
  parser exists (`parse-ai-output.ts`) for the staff path.
- **The model in production reads images.** DeepSeek V4.1 Flash on OpenRouter takes image input;
  the AI wizard already has the image hook (an `imageQuery` our server searches,
  [`../media/media-pipeline.md`](../media/media-pipeline.md) §8).

## 2. Decisions

### Words

`Global` is renamed **`Public`** (enum, wire value, labels; `"Global"` still accepted on input). The
enum is stored as an int, so no migration. "Shared" stays free for sharing with friends. The feature
is **Screenshot import** (glossary). It copies questions it sees; it never writes new ones and never
translates.

### Who picks which questions (the picker)

| Caller | Tab: Your questions | Tab: Public questions |
|---|---|---|
| Everyone, admins included | their own | every Public question |

Nobody — admin or not — picks another person's Private question for a quiz; for admins that would
be a privacy breach. The scope is enforced on the server, not by the query filter (which lets admins
see everything). Editing a picked question someone else owns edits a copy for that quiz only — the
existing rule ([ADR 0030](../adr/0030-the-builder-edits-a-saved-question-as-a-copy.md),
[ADR 0031](../adr/0031-the-builder-edits-a-saved-question-in-place-only-when-nothing-else-would-notice.md)).
The menu item *Browse Public Pool* is renamed (the glossary avoids "pool"). The admin Questions page
still lists everything — that is moderation, not picking.

### Pasted questions — every signed-in user

- **In the quiz builder, not a new page:** a **Paste questions** button beside *Add a question*,
  with a short tutorial: how to ask your own AI, a *Copy the format* button, and the paste box.
- **Creation only.** Pasted questions become draft questions in the builder's own list, marked
  *Pasted — check*, edited with the usual editor. No ids, no updating existing questions.
- **Always Private.** Parsed by the existing `parse-ai-output.ts`, same format.

### Screenshot import — Admin and SuperAdmin, admin dashboard only

| Decision | |
|---|---|
| Where | the admin Questions page, a fourth create card beside the three types |
| Input | up to 10 images a request; JPEG, PNG or WebP; ≤ 10 MB and ≤ 40 MP each (the upload pipeline's existing checks — format sniffed from the bytes, header read before any pixel is decoded) |
| The image | shrunk to 1344 px on the long edge, metadata stripped, sent to the model, **discarded** — never stored |
| Question type | an import-level *Make them*: **Multiple choice by default**, or As they appear, or Type the answer; each row can switch. The model always returns the answer, three wrong options and alternates, so switching costs no second call |
| Missing answers and options | the model fills them in, marked *Suggested — check*, and checked against Wikipedia with the existing grounding (ADR 0038/0039) |
| Category, difficulty, language | proposed by the model from the existing lookups only (closed lists in the prompt; the code validates). Language is the screenshot's own |
| Duplicates | flagged *Possible duplicate of #id* and left unticked, never blocked |
| Visibility | Public by default, a switch per row |
| Pictures | a question that needs a picture gets an `imageQuery` (picker search) as a suggestion. **A question whose picture is the question** ("what is missing from this flag") is not supported yet — it needs two images, the asked one and the answer one. Such rows show greyed out: *Needs its picture — not supported yet* |
| Review | nothing is written until the reviewer saves; one review list for the whole import |
| Failures | up to 3 images at a time; a row per image as it finishes; a failed or empty image costs nothing from the allowance and has its own *Try again* |
| Allowance | per image, separate from AI quizzes: Admin a daily number (30 proposed), SuperAdmin unlimited; the site-wide spending caps apply to everyone |
| Record | one audit-log entry per import (who, images, questions saved) — no image, no new column |

**Cost, estimated:** $0.002–$0.008 a screenshot with thinking on low; mostly the model's thinking.
Reading text needs no thinking, so the transcription step runs with it **off**, and only the
answer-finding step thinks. To be measured, not assumed (§4).

## 3. Rejected

- **Generating questions from a picture of source text** — that is Source mode with a camera, which
  is closed on this model ([ADR 0037](../adr/0037-source-mode-writes-in-the-materials-language-and-opens-per-model.md)).
- **An "All" tab for admins in the picker** — admins picking other people's private questions.
- **Counting one import as one AI slot** — sending images one at a time would game it.
- **Translating** — not at this stage of the app.

## 4. Before it is switched on

The app is public, so this ships dark: `Ai:ScreenshotImport:Enabled` is false in production until —

1. **A test set of ~20 real screenshots** (with duplicates, missing answers, and a picture-is-the-question
   one) passes, run with thinking off and on low, recording accuracy and real cost.
2. **Storybook stories exist for every review-row state** — read from the image, suggested,
   possible duplicate, needs its picture — so each can be seen before it's met in production.

## 5. Phases

1. **Done 2026-11-10** on `question-bank-rules-and-image-import`: the `Global` → `Public` rename and
   the picker's two tabs with server-side scoping — now in [`../quiz/question-bank.md`](../quiz/question-bank.md).
2. **Done 2026-11-10** (on the same branch, to keep one test cycle): Paste questions in the builder,
   for every user — now [`../quiz/pasted-questions.md`](../quiz/pasted-questions.md).
3. **Built 2026-11-10, switched off** (same branch): screenshot import — now
   [`../quiz/screenshot-import.md`](../quiz/screenshot-import.md); Wikipedia checking of suggested
   answers (Q30) is not built yet. Then the mixed image search
   ([`mixed-image-sources.md`](./mixed-image-sources.md), on `image-sources-proposal`).
