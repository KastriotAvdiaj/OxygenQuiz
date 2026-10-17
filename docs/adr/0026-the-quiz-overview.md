# 26. Reviewing a quiz, and building one on a phone, happen in the quiz overview

Date: 2026-10-17
Status: Accepted

## Context

The quiz builder (`create-quiz.tsx`) is three columns on a desktop: the quiz's fields, the
question being edited, and the list of questions. Below `lg` the columns stacked in that order,
which turned a layout into a sequence nobody would choose:

- the list of questions — the builder's table of contents — ended up last, so picking a question
  meant scrolling past everything, tapping it, and scrolling back up to its editor;
- **Finish** sat between the editor and the list, reachable before most questions had been seen;
- the list's cards truncated the question and its answers, the very text a reviewer is there to
  read, and the editor's one-line question field showed ~15 characters of it;
- the quiz's fields came first, though after AI generation they are the part least likely to
  need changing.

And the AI flow landed every user, on every screen, in that builder — when what they do after
generation is *read* a quiz, and often change nothing at all.

## Decision

**A second interaction model, the quiz overview** (`components/overview/`): the quiz as a
reading list — a summary card, every question in full, a bar pinned to the bottom — with editing
always in a dialog, never inline. A question opens in a near-full-screen dialog (Previous / Next,
a tap outside closes it); the quiz's own fields open in a dialog of their own.

**Who gets which:**

| | Phone / tablet (`< lg`) | Desktop (`≥ lg`) |
|---|---|---|
| AI review | Overview | Overview |
| Manual create / edit | Overview | Three columns (unchanged) |

AI review gets the overview everywhere because the job is reviewing, whatever the screen. Building
by hand on a desktop keeps the three columns, which suit writing many questions side by side.

**The switch is a media query in JS** (`useMediaQuery`), not CSS. The two models mount different
things — the quiz fields live in the sidebar in one and in a dialog in the other — and
react-hook-form must see only one copy of each field. Showing and hiding both with
`hidden lg:block` would register every field twice.

Two behaviours come with it:

- **Answers can be kept back.** In AI review the correct answer is hidden until *Reveal* (per
  question) or *Show answers* (all), because the author may be making the quiz to take it
  themselves. Choices stay visible — they are part of the question; only which one is right waits.
  A typed answer has nothing to list, so its answer is what's hidden.
- **Questions reorder by drag**, on every screen and in both models, by a grip so a swipe elsewhere
  still scrolls — and holding a card at the edge scrolls the page. That last part ruled out
  framer-motion's `Reorder` (it can't follow a scrolling container), so it is a small hook of our
  own, `use-drag-reorder.ts`; see the feature doc.

## Consequences

- The builder has two layouts to keep working. They share every part that holds behaviour —
  `QuizDetailsFields`, `AddQuestionMenu`, the question editors, the question context — and differ
  only in arrangement. A new quiz-level field goes in `QuizDetailsFields` and appears in both.
- The overview's primary action names what it does — **Publish quiz** while the status is Public,
  *Save draft* for a Draft — since a new quiz now starts Public (`quiz-visibility.md`, "Defaults")
  and a review can be one tap.
- A failed submit has to reach dialogs that may be closed: an invalid question opens its editor,
  an unclassified quiz opens the details dialog, and a missing title scrolls the summary card —
  which lists the error — into view.
- Rotating a tablet across `lg` mid-edit swaps the model. Nothing is lost (state lives in the form
  and the question context, not in either layout), but an open editor dialog closes.

See [`docs/quiz/quiz-overview.md`](../quiz/quiz-overview.md) for how it behaves.
