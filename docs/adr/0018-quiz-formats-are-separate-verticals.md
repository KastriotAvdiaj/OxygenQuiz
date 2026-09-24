# 18. Quiz formats are separate verticals that share only the quiz and session headers

Date: 2026-09-22
Status: Accepted

## Context

OxygenQuiz is modelled on the TV show *Oxygen*, which has two kinds of game: the regular rounds
(the host asks 4–6 contestants ordinary questions) and a 1v1 final played on an **Associations**
board — four columns of four hidden tiles, each column with its own solution, and a final solution
that links the four. The app only implements the first. Associations is the next feature, and
Top 100 (a survey-ranked list game) is likely after it.

Everything that plays a quiz today is built on one contract, and it is stated in
[`../quiz/quiz-grading.md`](../quiz/quiz-grading.md): a quiz is an ordered list of `QuizQuestion`
rows; each is served whole, answered **once**, graded to a `bool`, and scored on a
higher-is-better, speed-weighted scale. `UserAnswer` has one `SelectedOptionId` or one
`SubmittedAnswer`. The multiplayer loop runs simultaneous rounds and keeps the first submission.
The resume walk (ADR 0008) knows a question as answered or timed out, nothing in between.

An Associations board breaks every one of those: a board takes many actions (open a tile, guess a
column, guess the final), its contents must be served a tile at a time or the answers are readable
in devtools, it can be half-solved, it scores by what was *not* revealed rather than by speed, and
the 1v1 final is turn-based.

## Decision

**A quiz has a `Format`. Each format is its own vertical** — its own content tables, its own play
service and rules engine, its own grading, its own multiplayer orchestrator and its own UI — and
the formats share exactly two things:

| Shared | Why it is shared |
|---|---|
| **`Quiz`** (title, description, category, language, difficulty, owner, `Status`, `ShareToken`, `Version`, `DeletedAt`) | Discovery, visibility, sharing, soft delete, publishing and optimistic concurrency are the same problem for every format and are already solved and tested. |
| **The `QuizSession` header** (who played, when, `TotalScore`, completed / abandoned, `Mode`, `MatchId`) and the `Match` row | History, abandonment, "one active session per quiz", guest deletion and the match record are the same problem too. |

Nothing below the header is shared. A board's moves are not `UserAnswer` rows, a board is not a
set of `QuizQuestion` rows, and the classic grader, scorer, submit service and match loop are not
taught what a board is. Every classic entry point instead **refuses** a quiz whose format is not
`Classic` (one guard, one message) so a board can never fall into code that assumes questions.

## Alternatives considered

**A new question type inside the classic quiz** — the first thing proposed, and rejected. It
would force the shared pipeline to change shape for everyone: grading off `bool`, `UserAnswer`
holding board state, a multi-action submit contract, a half-played state in the resume walk, and
turns in a loop built for simultaneous rounds. That is a foundation rewrite to serve one format,
paid for by every existing quiz, and every future format would reopen it. It also doesn't match
the product: in the show a final is never a question *in* a regular round.

**Fully separate tables, including the session** (an `AssociationSession` with no `QuizSession`
row). Keeps the classic numbers safe by construction, but every consumer that reads sessions —
history, abandonment, the active-session check, guest deletion, the admin cleanup — would need a
second implementation kept in step forever. This is the trade-off `Match.cs` already argues and
decides the same way (docs/quiz/multiplayer.md §7.1). Sharing the header and nothing else keeps
most of both benefits.

**A separate `AssociationQuiz` entity instead of a `Format` column.** Duplicates visibility,
sharing, soft delete and its query filter, the per-endpoint access checks (ADR 0019), publishing rules and the catalogue, all of
which are subtle and each of which has already shipped a bug once.

## Consequences

- **Every reader of `QuizSession` must decide what to do with a non-classic row.** Scores are on
  different scales (classic 1000–1500 per question, an Associations board at most a few dozen),
  so any average or best-score aggregate that mixes formats is wrong. Stats and analytics filter
  by format; the list of places is in [`../quiz/associations-plan.md`](../quiz/associations-plan.md).
- **Every classic entry point needs the format guard**, and the guard list must grow when a new
  classic entry point is added. Forgetting it is the failure mode to watch for: a board quiz has
  zero `QuizQuestion` rows, and much classic code treats zero as "finished" or "zero seconds"
  rather than as an error.
- **A new format costs a vertical, not a refactor.** Top 100 will be a third `Format` value with
  its own tables and service, and will not touch Associations or Classic.
- **`QuizQuestion` versioning does not cover a board.** The board carries its own
  `CreatedInVersion` / `RemovedInVersion` so a session still plays exactly the version it pinned.
