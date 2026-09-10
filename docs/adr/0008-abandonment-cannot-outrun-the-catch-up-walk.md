# 8. Abandonment cannot outrun the catch-up walk

Date: 2026-09-10
Status: Accepted

## Context

A player who leaves mid-quiz and comes back is handled by two mechanisms, and they run in a fixed
order inside `ResolveAndResumeAsync`:

1. **The abandonment check.** Is this session still resumable? If not, close it and return.
2. **The catch-up walk.** Time out the questions whose windows passed, then hand back the one the
   player lands on and how much of its window is left.

The second is a genuinely elaborate piece of work: it walks the pinned quiz version's unanswered
questions, burns overflow seconds through them in order, writes a `TimedOut` answer for each, and
returns a partially-consumed window for the survivor. `resume-projection.ts` mirrors it step for
step on the client so the "Session In Progress" screen can count down live, and
`session-resume-screen.md` documents the mirroring as the feature's safety property.

**The first mechanism made all of it unreachable.** The activity timeout was:

```
activityTimeout = longestQuestion × 2 + 60s
```

For a quiz of 30-second questions that is **two minutes**. Being away long enough to expire three
questions was already long enough to void the session — so the walk never ran past a trivial case,
and the screen's careful replay described a resume the server would refuse. The reported symptom
was a fifteen-question quiz showing:

> **Question 14 of 15 is still running** — resume within 26s and you keep it.
> *13 questions ran out while you were away and score 0.*

Thirteen expired questions is roughly six and a half minutes of absence. The session had been
abandoned after two. Every number on that screen was a correct replay of a walk that was never
going to happen.

Two facts made this survive so long. The catch-up walk and the abandonment check were written at
different times by different reasoning — one asks "which questions did they lose?", the other asks
"is this session stale?" — and **neither one's tests could see the other**, because each is
correct in isolation. And the deadline was never exposed anywhere: the client could not have
noticed the disagreement even in principle.

## Decision

**The activity timeout is defined so that it is never shorter than the longest catch-up the walk
could perform**, and the deadline is published to the client.

```
expectedDuration = Σ(question time limits) + questionCount × QuestionBufferSeconds
totalTimeout     = expectedDuration × (1 + TotalTimeoutBufferPercentage)
activityTimeout  = expectedDuration + ActivityBufferSeconds
```

The walk's reach is bounded by the total playable time of the session's *unanswered* questions,
which is at most every visible question's limit — strictly less than `expectedDuration`, which
also carries the per-question buffers. So the invariant holds by construction:

> **abandonment can only fire once the walk would have run out of questions anyway.**

Using every question rather than only the unanswered ones over-estimates late in a quiz, and that
is the deliberate direction. Too generous costs a stale row that the total-time cap reaps anyway;
too tight costs a player their session. The over-estimate also keeps the calculation off the
answered-questions join, so the five-minutely sweep stays a cheap query.

`ActivityTimeoutMultiplier` is gone — the multiplier had no meaning once the base changed from
"one question" to "the quiz" — and `DefaultMaxQuestionTimeSeconds` became
`FallbackActivityTimeoutSeconds`, which is what it always was: the window for a session whose
pinned version has no visible questions to derive one from. No `appsettings.*.json` in the repo
sets a `QuizSession` section, so every environment was already on the defaults.

**Second half: the deadline goes on the wire.** `ISessionAbandonmentService` gains
`GetAbandonmentDeadlineAsync`, the earlier of the two caps, and `IsSessionAbandonedAsync` is
redefined as *"now is past that deadline"* — one number, not two comparisons that happen to agree.
`SessionResumeStateDto.AbandonmentDeadline` carries it to the client on
`GET /quizsessions/{id}`, `projectResume` checks it as **step 0** before modelling anything else,
and `ActiveSessionView` shows "Session Closed" with a **See Results** button instead of offering
a resume that cannot succeed.

Both halves were needed, and it is worth being explicit about why neither would have done alone:

- **Timeouts alone** would have made the walk reachable, and left a screen that still lies for
  every session that genuinely does expire — including every one already in the database.
- **The deadline alone** would have made the screen honest about a feature that essentially never
  ran: correct, and useless. "You were away too long" two minutes into a fifteen-question quiz is
  a true statement and a bad product.

Rejected alternatives:

- **Reorder `ResolveAndResumeAsync` so the walk runs first.** Superficially attractive — the walk
  would then complete the quiz and abandonment would rarely matter. But it writes a `TimedOut`
  answer per question, so a session nobody is coming back to would fill the answer table on its
  way out, and the abandonment reason (which the results screen shows) would be lost.
- **Drop the abandonment check from the resume path and leave it to the sweep.** The check is
  what stops a session being resumed hours later; removing it makes the sweep's cadence
  load-bearing for correctness rather than for tidiness.
- **Compute the deadline client-side from `pendingQuestions`.** The client already has the
  question limits, so it looks free. It would be a *second* implementation of a rule the server
  enforces, drifting the moment either changed — which is the entire bug, reintroduced one layer
  down. The client is told the answer instead.
- **Make the activity timeout a flat configured number** (say 30 minutes, which the dead
  background service used). Simple, and wrong in both directions at once: far too generous for a
  five-question sprint, far too tight for a long quiz of 2-minute questions. The timeout has to
  scale with what it is protecting.

## Consequences

- **Sessions now stay resumable for roughly the length of the quiz.** A fifteen-question quiz of
  30-second questions goes from a 2-minute inactivity window to about 9¾ minutes, capped by the
  total-time limit at about 13 minutes from the start. That is a real behaviour change for
  players, and the intended one.
- **The catch-up walk is reachable for the first time.** So is its client mirror, and so are the
  parts of `ActiveSessionView` that render a partial tally. Code that "worked" for months by never
  executing is now on the hot path — worth knowing when reading a new bug report about it.
- **A session that never served a question still ages out**, measured from its own start.
  `MaxConcurrentSessionsPerUser` is 1, so an immortal session is a player who can never start that
  quiz again.
- **The two timeouts are now coupled on purpose.** `ActivityBufferSeconds` is no longer a free
  parameter: shrinking the activity timeout below the quiz's playable time re-breaks the walk.
  `SessionAbandonmentTimeoutTests` states the invariant behaviourally — a session at the walk's
  furthest reach must still be resumable — so a future edit to the arithmetic fails with a name
  rather than silently restoring the old bug.
- **The published deadline is now a promise.** Anything that decides abandonment must go through
  `GetAbandonmentDeadlineAsync`, because the client renders "you can still resume" directly off
  it. A second code path with its own opinion is a screen that lies again.
- **The general lesson.** Two correct mechanisms, each with passing tests, composed into a
  guarantee neither of them made. What was missing was not a test of either one but a statement
  of the relationship between them — and the relationship only became testable once one of them
  published a number the other could be compared against. When a check gates a feature, the
  feature's reachability is part of the check's contract.
