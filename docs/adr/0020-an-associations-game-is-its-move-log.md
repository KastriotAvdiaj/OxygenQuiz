# 20. An Associations game is its move log

Date: 2026-09-23
Status: Accepted

## Context

An Associations game (a Board being played, Solo or Duel) has a lot of state: which of the 16 Tiles
are open, which Columns are solved and by whom and for how much, whether the Final is solved, each
Seat's score, and in a Duel whose turn it is, how long it has been running, and how many endgame
turns each Seat has used. Every write path would have to keep that state right: a Solo move, a Duel
move, a turn timing out, the board clock running out while the player is away, the abandonment
sweep, a forfeit, deleting a guest's session.

This codebase has twice kept a derived value "in step" by hand and had it drift the first time one
path forgot: the stats that are now computed on read ([`user-stats-history.md`](../quiz/user-stats-history.md)),
and the abandonment timeout that could outrun the resume walk
([ADR 0008](./0008-abandonment-cannot-outrun-the-catch-up-walk.md)).

The engine (`AssociationEngine`) was already written as a pure function from a start state, a board,
the rules and a list of moves to a state — so the same moves always give the same game.

The scoring numbers are settings (`Associations:Rules`), meant to become per-quiz and editable.

## Decision

**The moves are the game.** `AssociationGameMove` rows — one per accepted move, numbered
`Seq` 1, 2, 3… with a unique `(GameId, Seq)` — are the record. Board state is never stored: every
read and every move loads the log and replays it through the engine, then (for a move) applies the
new move to the replayed state and appends it.

The `AssociationGame` row holds only what the moves can't say: the Board version played, the start
time, the Solo deadline, the first Seat of a Duel, an ending the **server** decided (`TimeUp`,
`Forfeit`, `Abandoned`) — and **the rules the game is played with, as a JSON snapshot
(`RulesJson`), written at start and never updated**. Replay reads the snapshot, never the current
configuration.

One number is denormalised, deliberately: `QuizSession.TotalScore`, because every session reader
(history, stats, reports) already expects it. It is written on every scoring move, not only at the
end, so a game that ends by the clock or the sweep already carries its score.

## Consequences

- **Resume, the results review and (Phase 5) the Duel timeline are the same operation** — replay —
  and cannot disagree with each other or with the move that was just made.
- **No write path can leave the board inconsistent**, because none of them writes board state. The
  abandonment sweep, for instance, only stamps the game's `EndReason`; the next read replays the
  moves and applies it.
- **Changing a scoring setting never rescores a finished game.** Without the snapshot it would:
  `ReplayAndRulesTests` shows one log scoring 35 under its snapshot and 37 under a changed
  `FinalBase`, and `AssociationPlayServiceTests` shows a running game keeping its snapshot when the
  configuration changes mid-game.
- **A log the engine refuses is corrupt**, and replay throws rather than skipping the move — a game
  nobody played is worse than an error.
- **Every request replays.** For a Board that is 16 Tiles and a few dozen Guesses — nothing — but a
  future format with long games would have to reconsider (a snapshot every N moves, say).
- **Analytics can't query board state in SQL.** `AssociationGameMove.Points` and `IsCorrect` are
  written for exactly that (Phase 6's "hardest Column", "common wrong Guesses"), but anything that
  depends on state *between* moves needs a replay.
- **Double submission** is handled by the unique `(GameId, Seq)` index: two requests that replay the
  same log both try to append the same `Seq`, one wins, the other gets 409 and refetches.

See [`associations.md`](../quiz/associations.md) §6 (the engine) and §9 (playing).
