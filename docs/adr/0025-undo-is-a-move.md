# 25. Undo is a move, not a deletion

Date: 2026-10-01
Status: Accepted

## Context

In Host mode the Teacher types for the class, so a slip is the Teacher's, not the students': B2
clicked when the Team said B3, "Rom" sent for "Rome". Host mode offers **Undo** of the most recent
move ([`classroom-plan.md`](../quiz/classroom-plan.md)).

[ADR 0020](./0020-an-associations-game-is-its-move-log.md) makes the move log the game and has
every move append. The simplest Undo — delete the last row — would make the log editable, and a
review would no longer show what the class actually saw (a Tile opened by mistake has been seen).

## Decision

**Undo appends a move of its own** (`MoveKind.Undo`) that names the move it cancels. Replay applies
the log in order and skips a move that a later Undo cancels; the game's state is as if it had never
been made, except that the review lists both — "opened B2", "undid: opened B2".

Only the latest effective move can be undone, and an Undo can't be undone. It is a Host mode move
only; Solo and the Duel refuse it.

## Consequences

- The log stays append-only, so ADR 0020's guarantees hold unchanged: replay is still a pure function
  of the log, and the unique `(GameId, Seq)` still settles a double submission.
- Replay has one more rule — find cancelled moves first — and the engine tests cover a log with
  Undo in every position it's allowed.
- A Tile opened by mistake and undone is closed again on the board, but the review shows it was
  opened: the record matches what the class saw.
- Clocks: an Undo doesn't give time back. The turn clock keeps running from where it is.
