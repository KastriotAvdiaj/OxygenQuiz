# Multiplayer persistence — plan

> **Status: planned, not built.** Nothing in this document exists in code yet. Fold what survives
> into [`multiplayer.md`](multiplayer.md) and delete this file once it ships.

## What happens today

Nothing is written. A match is graded entirely in memory:

```csharp
// MatchOrchestrator.GradeRoundAsync
var userAnswer = BuildUserAnswer(round, submission, session.QuestionStartTime);
var grade = await grading.GradeAnswerAsync(round.QuizQuestionId, userAnswer, session.QuestionStartTime);
```

Those `UserAnswer` objects exist only to be handed to `IAnswerGradingService`. They are never
attached to a `DbContext`, no `QuizSession` row is created for a match, and `ResetToLobbyAsync`
clears the scoreboard when the match ends.

The consequences, all of which we want to stop being true:

- **A match leaves no record.** No history entry, nothing to revisit, no proof it happened.
- **Quiz analytics never see it.** `ReportService` reads `_context.QuizSessions` and
  `_context.UserAnswers`; multiplayer writes neither, so a quiz played a hundred times in
  multiplayer reads as never played.
- **Personal stats never see it.** `UserStatsService` reads the same two tables.
- **The results screen is transient.** `ResultsPanel` shows the winner and a scoreboard built
  from in-memory state, and "Back to lobby" destroys it. A player cannot see *which* questions
  they got wrong, then or ever.

## Shape

One `Match` header row, plus **the same `QuizSession` and `UserAnswer` rows single player already
writes**, one session per player.

Three players finishing a 5-question match on quiz 12:

| Table | Rows | Holds |
|---|---|---|
| `Match` *(new)* | 1 | quiz id, pinned quiz version, room code, host user id, started/ended, winner user id |
| `QuizSession` *(existing)* | 3 | one per player, plus `Mode = Multiplayer` and `MatchId` |
| `UserAnswer` *(existing)* | 15 | 3 players × 5 questions, unchanged shape |

The point is the middle row. Multiplayer stops being a parallel universe and starts writing the
tables every existing reader already understands, so analytics, personal stats and the results
pages work without being taught what a match is. The `Match` header carries only what belongs to
the match rather than to any one player — room code, host, winner, the shared question order.

**Guests are not a complication.** `QuizHub` is `[Authorize]`, so every participant in every match
is a real account with a real id. Nothing here needs the `GuestAccount` placeholder that
single-player guest play uses ([`../auth/guest-play.md`](../auth/guest-play.md)).

The alternative — a separate `Match` / `MatchParticipant` / `MatchAnswer` set of tables — was
rejected. It keeps single-player numbers safe by construction, but it means a second reader for
every consumer: a second analytics query, a second stats query, a second results page, each of
which has to be kept in step with the first forever.

## Decisions already taken

- **Multiplayer plays are excluded from a quiz's analytics by default**, with a mode filter to
  include or split them. A fixed clock and social pressure depress scores for reasons that have
  nothing to do with question quality, and an author's "average score" is their signal for
  exactly that. Mixing the two silently makes one number mean two things.
- **They are included in personal stats.** The player played; it counts.
- **The results page is permanent and is the single-player page.** `/quiz/results/:sessionId` and
  `/quiz/results/:sessionId/review` already exist and already render a session's score overview
  and per-question breakdown. A match's per-player session gets those URLs for free.
- **Everyone in a match can see everyone's answers, permanently.** Not just in the moment — you
  were all in the same room, and hiding it a week later would be strange. The review screen grows
  a tab per player.

## Work

1. **Migration.** `Match` table; `Mode` and `MatchId` on `QuizSession`. Existing sessions backfill
   to `Mode = SinglePlayer`.
2. **`MatchOrchestrator` writes.** Keep the `UserAnswer` objects it already builds, attach them to
   a scoped `DbContext`, and save once at match end rather than per round — a mid-match database
   round trip per player per question is latency the round loop does not have.
3. **`AbandonedSessionSweeper` skips `Mode = Multiplayer`.** Otherwise it will start flagging
   finished matches as abandoned: a match session is created and completed inside the match loop
   and never looks like an active single-player session.
4. **The resume path refuses multiplayer sessions.** "Where was I?" is meaningless for a match
   that has ended, and `ResolveAndResumeAsync` would otherwise try to catch one up.
5. **`ReportService` gains a mode filter**, defaulting to single-player only, plus the toggle on
   the analytics page.
6. **The review screen grows player tabs**, reading from the database rather than from
   `match.lastResult`.

## Settled since

**A rematch is a new `Match` row.** It is a separate game with separate answers; the lobby is what
persists across it ([`multiplayer.md`](multiplayer.md) §3.1), not the match.

**A mid-match disconnect records the answers that were given and marks the rest as not answered,
attributed to leaving.** Most of the mechanism is already there and did not need designing:
`OnDisconnectedAsync` grants a five-second grace period and then removes the participant only if
the connection id that dropped is still theirs (so a refresh survives), and `GradeRoundAsync`
iterates the *current* participant list — so a player who has left simply stops appearing in later
rounds. What is missing is only the record. Their session row ends up with fewer `UserAnswer` rows
than the match had questions, which is exactly the shape we want; it needs a status on the session
that distinguishes "played and got these wrong" from "was not there for these", so the review
screen can say *left* rather than showing silent blanks.

Still to pin down, at step 2 rather than now: whether that status lives on `QuizSession` (a
multiplayer-specific completion state) or on the `Match` participant record, and whether a player
who leaves before answering anything gets a session row at all.

## Open

- Whether `Match` should survive a **quiz being soft-deleted**, given `Quiz` already has its own
  `DeletedAt` filter and sessions deliberately outlive it. No answer yet, and it does not block
  steps 1–4 — the default (it survives, like sessions do) is reversible, and the reason to revisit
  is if a deleted quiz's matches start showing up somewhere they shouldn't.
