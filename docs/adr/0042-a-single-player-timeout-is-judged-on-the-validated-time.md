# 42. A single-player timeout is judged on the validated time, not the raw server clock

Date: 2026-11-08
Status: Accepted

## Context

A Classic question's timeout was decided on the raw server window — answer received minus
question served — with `GracePeriodSeconds = 0`. That window contains the whole round trip: the
question's download and render before the player's clock starts, and the answer's upload after
they click. So an answer clicked in the last second arrived "late" by its own latency, was saved
with the pick, and scored 0 as `TimedOut`. Players saw it as "I clicked in time and it still says
timed out", with *Your Answer* on the review card (reported 2026-11-08: 29s on a 30s question).

Scoring already solved the same problem. `QuizTiming.EffectiveElapsed` accepts the client's
measured think time when it is inside the server window and within `MaxLatencyCreditSeconds`
(2s) of it, and falls back to the server window otherwise. Timeouts were kept off it on purpose:
"the client can never talk its way out of a timeout" (`docs/quiz/quiz-grading.md`).

## Decision

**The timeout is `IsTimedOut` from the client, or `QuizTiming.IsLate`: the validated elapsed time
past the limit.** The same number the answer is scored with decides whether it was in time.

The alternative was a fixed grace period (say 1–2s) on the server clock. It helps a fast connection
as much as a slow one, fails whoever's round trip exceeds it, and is a second number to keep in
step with the latency credit. The validated time already measures each player's real round trip
and already has the bound we accepted for scoring.

## Consequences

- A tampered client can now gain up to the latency credit (2s) on the timeout, not only on the
  speed bonus. That is the bound already accepted for scoring: the same few seconds an honest
  player on a slow connection really spent. A claim beyond it is ignored, so an answer later than
  limit + 2s still times out.
- A client that reports no think time is judged on the server clock, as before.
- Multiplayer is unchanged: its deadline is the server's round clock, shared by every player in
  the room (`docs/quiz/multiplayer.md`).
- A genuine timeout from the client's own timer still sends no answer, so a `TimedOut` row that
  keeps a pick now means an answer that was really later than the credit.
