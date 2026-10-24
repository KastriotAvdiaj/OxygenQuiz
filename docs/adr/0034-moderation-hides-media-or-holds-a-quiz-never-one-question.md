# 34. Moderation hides media or holds a quiz — never one question

Date: 2026-10-24
Status: Accepted

## Context

Reports (docs/media/moderation.md) need a way to take reported content out of sight before a
moderator gets to it, and moderators need one to keep it out afterwards. Nothing in the app could
hide anything before this.

The thing reported is usually one question. Hiding *that question* looks like the precise answer,
and it is the wrong one:

- a quiz's question count, its total score and its grading would change under a game in progress —
  the thing copy-on-write editing exists to prevent (`docs/quiz/quiz-editing.md`);
- a question can be live in several quizzes, written by different people;
- a quiz missing a question it was built around reads as a bug, not as moderation.

The owner's `Status` (Draft / Unlisted / Public) is the other obvious lever — set a reported quiz
to Draft. But the owner controls it, so they could republish it a second later, and the change
would erase what the quiz's status was before.

## Decision

**Two moderation states, each its own column, neither one the owner can change:**

- **`Question.MediaHiddenAt`** — the question's image or clip sits under a cover. The question still
  plays and scores as before. Signed-in players may choose *Show anyway*; play payloads carry no URL
  for hidden media, so a guest has no way past it.
- **`Quiz.ModerationHeldAt`** — the quiz leaves the catalogue, its listing and the sitemap, and only
  its owner can open or play it. For offensive *text* in a question, every quiz the question is live
  in is held.

Like visibility (ADR 0019), the hold is checked at each entry point that serves a quiz — there is no
query filter for it, because a second `HasQueryFilter` on `Quiz` would replace the soft-delete one.

## Consequences

- Hiding never changes a game in progress or any quiz's scoring; releasing restores exactly what was
  there, because nothing else was touched. Rejecting a report undoes both states.
- The granularity is coarse on purpose: one offensive question holds its whole quiz until a
  moderator looks. The author fixes the question; the moderator releases the quiz.
- Every new endpoint that returns a quiz must check `ModerationHeldAt` as well as the status — the
  same discipline ADR 0019 already asks for. `HoldAndPickedEntryPointTests` has a test per entry
  point; a new entry point adds one.
- A quiz's cover image can't be covered on its own: cards show it everywhere, so a reported cover
  holds the quiz or is removed.
