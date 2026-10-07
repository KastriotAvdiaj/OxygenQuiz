# 23. A hosted Team is a Seat, and a hosted game is saved move by move

Date: 2026-10-01
Status: Accepted

## Context

Host mode ([`classroom-plan.md`](../quiz/classroom-plan.md)) is a Teacher running one Board for 2–4
Teams taking turns, under the Duel's rules (§3.3 of [`associations.md`](../quiz/associations.md)):
open one Tile, keep guessing while right, a wrong Guess or a Pass hands over, a fixed endgame.

Two existing shapes were candidates, and neither fits whole:

- **The Duel** has the rules, but it lives in memory (`AssociationDuel`, driven by the lobby's
  orchestrator) and writes its move log once, when it ends. A Seat is a signed-in player with a
  `QuizSession`. A hosted game is paused at the bell and finished next lesson — it must survive a
  restart — and its Teams are names, not accounts.
- **Solo** is saved after every move and resumes from the database, but it has one Seat and none of
  the turn rules.

The third option was a separate game model for classrooms, with its own turn logic.

## Decision

**A hosted game is an `AssociationGame` with `PlayStyle.Hosted`, and each Team is one Seat.** The
engine runs it exactly as it runs a Duel — `StartDuel` with a seat count of 2–4 — so there is one
set of turn rules for both.

**It is persisted like Solo:** every accepted move is appended to `AssociationGameMove` as it is
made, and every read replays the log ([ADR 0020](./0020-an-associations-game-is-its-move-log.md)).
Nothing about it lives only in memory.

**A Seat in a hosted game has no `QuizSession`.** The Teams are rows of their own (`HostedTeam`:
the game, the Seat, a name, a colour, the students' names as they were that day), not
`AssociationGamePlayer` rows. The game belongs to the Teacher who hosts it.

## Consequences

- Turn rules are written once. A rule change to the Duel's turn applies to Host mode, deliberately;
  a rule only one of them should have becomes a setting in `AssociationRules`, not a branch.
- The engine never learns about Teams or Teachers — it already only knew Seats, which is what the
  glossary's "a future team game puts two players on one Seat" anticipated.
- A hosted game writes no `QuizSession`, so nothing in stats, history, streaks or reports sees it —
  which is the decision ("it doesn't count as the Teacher playing"), reached without a filter.
  Anything that lists games through sessions won't find hosted ones; Hosted games are listed from
  `AssociationGame` by host.
- Clocks the Duel keeps in memory (the turn clock) are stored on the game row for Host mode, so a
  paused or restarted game knows where it was.
- If Live classroom later puts signed-in students on a Seat, they join a Team; a Seat can then have
  both a `HostedTeam` and sessions. That is additive.
