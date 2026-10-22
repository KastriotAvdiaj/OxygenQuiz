# 31. The builder edits a saved question in place only when nothing else would notice

Date: 2026-10-21
Status: Accepted — supersedes [ADR 0030](0030-the-builder-edits-a-saved-question-as-a-copy.md)

## Context

ADR 0030 made every saved question read-only in the quiz builder, editable only as a copy. That
was right for a question from the bank and wrong for the common case: an author editing a quiz they
built, whose questions they wrote for it. Every one of those now needed a confirmation and left an
unused original behind in their bank — friction and clutter for an edit nobody else could see.

The obvious fix — "questions created with the quiz are editable" — isn't available: nothing
records where a question was made, and a question created inside a quiz is indistinguishable from
one made on the Questions page. It also isn't the property that matters. An in-place edit is unsafe
when it reaches someone else, and there are exactly three ways it can:

1. the question is **someone else's**;
2. **another quiz** uses it, and would change too;
3. **players have answered it**, and their results would now show a different question.

## Decision

A saved question is edited **in place** when it is the caller's, no other live quiz uses it, and no
answer row points at it. Otherwise it stays read-only with **Edit for this quiz** (a copy, as in
ADR 0030), under a notice that names which condition failed.

- **One rule, on the server:** `QuestionEditRule.Decide`, fed by
  `IQuestionRepository.GetEditFactsAsync`. `GET /api/questions/editability` reports it; the
  question update endpoints enforce it (409) when called with `fromQuizBuilder=true`. The client
  only decides what to offer.
- **Owner only, admins included.** In the builder an admin acts as the quiz's author; editing
  everywhere stays a Questions-page action under `question:update:any`.
- **Unchanged edits are not saved.** The editors write back on open; the builder compares with the
  original and skips the update.

## Consequences

- A question written for a quiz stays plainly editable until the quiz is played or the question is
  reused — then it locks, and the notice says why. That moment can surprise an author; the reason
  line is there so it doesn't read as a bug.
- The in-place save happens before the quiz save, as new questions are created before it. If the
  quiz save then fails, the question edit has still landed — the same non-atomic order the manual
  create path already has (`known-issues.md`, quiz-creation atomicity).
- The rule can change between the builder asking and saving (someone plays the quiz meanwhile).
  The server re-checks and refuses with 409; the author edits a copy instead.
- The Questions page still edits played questions in place, rewriting what past results show. Out
  of scope here; logged in `known-issues.md`.
