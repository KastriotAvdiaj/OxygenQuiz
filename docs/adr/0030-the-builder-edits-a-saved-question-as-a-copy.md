# 30. The quiz builder edits a saved question as a copy, never in place

Date: 2026-10-21
Status: Superseded by [ADR 0031](0031-the-builder-edits-a-saved-question-in-place-only-when-nothing-else-would-notice.md) (same day) — "always a copy" became "a copy unless nothing else would notice"

## Context

In the quiz builder, a question that is already saved in the question bank (positive id) has
always been shown read-only; only drafts written in the builder (negative ids) get an editor.
Nothing on screen said so. Editing a quiz — where every question is saved — read as a bug: "the
questions seem to be locked and I can only remove them".

The read-only rule has a reason. A `QuestionBase` row is shared: the same question can be in several
quizzes, other people's included, and it can be edited from the Questions page by its owner or a
holder of `question:update:any`, which changes it everywhere at once. Quiz editing versions a
quiz's *use* of a question ([quiz-editing.md](../quiz/quiz-editing.md)), not the
question's content.

Three ways to let the builder change a saved question:

1. **Edit the shared row in place**, as the Questions page does. The change lands in every quiz using
   it — someone tidying their own quiz silently rewrites another author's — and needs ownership or
   a permission, so most users would still see it locked.
2. **Edit a copy for this quiz.** Swap the question for a draft with the same content; saving the
   quiz creates it as a new question and points the quiz at it.
3. Offer both and ask each time.

## Decision

**Option 2.** The builder's *Edit for this quiz* turns a saved question into a draft copy
(`edit-copy.ts`) at the same position, with the same points and time limit, after a confirmation
that says the original and other quizzes stay as they are. The copy belongs to the editor and
starts **Private** — copying someone's Public question must not publish a duplicate of it under the
copier's name. A notice above every saved question says why it is read-only and offers the copy.

Changing a question everywhere stays where it was: the Questions page.

## Consequences

- **Anyone can change the content of any question they put in their quiz**, without a permission,
  and nobody else's quiz moves.
- **Copies accumulate.** Editing your own question that no other quiz uses still leaves the
  original in your bank, now unused. Logged in `known-issues.md`; an in-place edit for exactly that
  case (owner, used by this quiz only) is the obvious refinement.
- **Answer history is unaffected** either way: the quiz's join row to the original is retired by the
  normal copy-on-write diff, and past sessions keep pointing at it.
- Rejected: option 1 (rewrites other quizzes; most users couldn't use it), option 3 (a question
  most people can't answer, asked every time).
