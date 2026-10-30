# 36. An edit takes a quiz out of the picked catalogue

Date: 2026-10-27
Status: Accepted

## Context

A picked quiz is in the default catalogue and the sitemap because someone looked at it
([moderation.md](../media/moderation.md) §5). Until now a pick was permanent: the author could
edit the quiz afterwards, and nothing noticed that the quiz in the catalogue was no longer the one
that was reviewed. Questions make this wider than the quiz editor: a question is shared, and an
edit from the question bank changes every quiz it is live in.

At the same time the owner wanted trusted creators whose quizzes go into the catalogue without a
review, so "who may change a picked quiz" needed an answer anyway.

## Decision

**A content edit by someone without `quiz:autopick` unpicks the quiz** (`QuizHouse.UnpickForEdit`).
Content is everything a player sees: title, description, classification, cover, questions, board,
time. A save that changes nothing, or only the status, keeps the pick. A question edit unpicks every
picked quiz the question is live in, whoever owns them.

**Auto-pick is a permission, `quiz:autopick`, not a role.** Its holders' quizzes are picked at
creation and their edits keep a pick. Staff (Admin, SuperAdmin) always count as holders. House
(`IsHouse`) stays a role check: it decides the badge, not the pick.

## Consequences

- Strict on purpose: a typo fix costs a re-pick. The alternative, trusting edits, makes a pick a
  one-time pass that a quiz can be changed after.
- The author is told before saving (`PickedEditNotice` in both builders), not after.
- Someone else's question edit can unpick a quiz its author never touched, house quizzes
  included. The quiz did change, so the rule holds; the moderator re-picks it.
- The question-bank path unpicks with one `UPDATE` and doesn't notify the owners of the quizzes it
  unpicks. Revisit if it turns out to happen often.
