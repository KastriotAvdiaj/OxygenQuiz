# The "Session In Progress" screen

`src/pages/Quiz/Sessions/components/quiz-taking-process/active-session-view.tsx` — shown when a
player opens a quiz they already have an unfinished session for. Resume, Start Fresh, or go back.

It is the only screen in the app where **the server's clock keeps running while the player looks at
it**, and that is what this document is about.

---

## The problem it solves

A player walks away eight seconds into question 6 of 12. Two minutes later they come back and this
screen opens.

The old version read the session once and rendered the numbers it found: *5 / 12 questions,
started 8 min ago.* Both were true when the response was built, and neither was true by the time
anyone read them. Pressing Resume ran `ResolveAndResumeAsync`, which timed out question 6, burned
the leftover seconds through 7 and 8, and dropped the player on question 9 — three questions
scored zero, with nothing on the previous screen having hinted that a clock was running at all.

Nothing was broken. The screen was just describing a moment that had already passed.

## What it does now

The session payload carries its own clock (`QuizSessionDto.ResumeState`), and the screen replays
the backend's catch-up locally, once a second:

- the question in flight counts down on a ring, in the same colours `QuizTimer` uses;
- when it runs out, the tally moves — answered *plus* expired — and a red segment appears on the
  progress bar for the questions that are now worth zero;
- the countdown rolls onto the next question's window and keeps going;
- when nothing is left, the screen becomes **"Time's Up"** and Resume becomes **"See Results"**,
  which is exactly what the backend will do (`ResolveAndResumeAsync` completes the session and
  `handleResumeSession` navigates to results);
- and once the session passes its **abandonment deadline**, the screen becomes **"Session
  Closed"** — a different outcome with the same destination, explained under
  [Step 0](#step-0-the-check-that-runs-before-the-walk) below.

The player is never surprised by where Resume lands them, because they watched it get there.

---

## The three pieces

| Piece | Where | Job |
| --- | --- | --- |
| `SessionResumeStateDto` | `QuizAPI/DTOs/Quiz/QuizSession-UserAnswerDTO.cs` | The live clock, projected onto every unfinished session's DTO |
| `projectResume()` | `.../quiz-taking-process/resume-projection.ts` | Pure function: replays `ResolveAndResumeAsync` for a given instant |
| `useResumeProjection()` | same file | Re-evaluates it as the wall clock moves |

### What the server sends

`ResumeState` is null on a completed session and present on every unfinished one. It carries:

- `serverTimeUtc` — the server's clock when the DTO was built;
- `currentQuizQuestionId` / `currentQuestionStartTime` — the question in flight, if any;
- `pendingQuestions` — every unanswered question of the session's **pinned quiz version**, in play
  order, as `{ quizQuestionId, timeLimitInSeconds }`;
- `abandonmentDeadline` — when the session stops being resumable at all. See Step 0.

Ids and time limits only. No text, no options, no answers — this leaks nothing a player could not
get by pressing Resume, which is the point: the screen predicts the shape of the catch-up, not its
content.

It is projected in `EntityMappers.ProjectSession`, so it costs one correlated subquery on a query
the resume screen was already making. There is no second endpoint and no second round trip.

`abandonmentDeadline` is the one field that is **not** projected in SQL. It needs the timeout
options and an aggregate over the quiz's question limits, so it is filled in afterwards by
`GetSessionDtoAsync(..., includeAbandonmentDeadline: true)` — and only for
`GET /quizsessions/{id}`, the read that actually feeds this screen. Answer submission gets the
same DTO without it and pays for nothing. Absent means "no abandonment knowledge", and the
projection then behaves exactly as it did before the field existed.

`ServerTimeUtc` is stamped by a **property initializer**, not inside the expression tree. "Now" is
a client-side value either way, and putting `DateTime.UtcNow` in an expression tree makes it a
provider-translation question it does not need to be. `SessionResumeStateTests.ServerTimeUtc_IsStamped` pins it, because
the failure mode is silent: a default `DateTime` would have the client compute a clock offset of
about two thousand years.

### Step 0: the check that runs before the walk

`ResolveAndResumeAsync` does **two** things, in this order:

1. **Is this session still resumable at all?** (`ISessionAbandonmentService.IsSessionAbandonedAsync`)
   If not, it closes the session and returns. No walk, no timed-out answers.
2. Only then, the catch-up walk — steps 1 to 3, the part this screen was built to mirror.

For months the screen modelled step 2 and knew nothing of step 1, and the result was the exact
failure this file's own contract forbids. A player who left a fifteen-question quiz for five
minutes came back to:

> **Question 14 of 15 is still running** — resume within 26s and you keep it.
> *13 questions ran out while you were away and score 0.*

Every number there was a correct replay of the walk. The session had also been abandoned four
minutes earlier, so pressing Resume ran step 1, closed it, and never reached the walk at all. (It
also threw on the way — see `BuildCompletedResultAsync` — but the promise was already false
without that.)

**The fix is that the deadline is now on the wire.** `abandonmentDeadline` is
`GetAbandonmentDeadlineAsync`, the *same number the server tests itself against* —
`IsSessionAbandonedAsync` is defined as "now is past this" and nothing else, so the two cannot
drift. `projectResume` checks it first, before anything else, and returns
`{ isAbandoned: true, isComplete: true }` with **no tally**: abandonment creates no timed-out
answers, so "13 questions ran out" would be inventing a story about questions that were never
resolved.

`ActiveSessionView` then says "Session Closed", explains that anything already answered still
counts, and offers **See Results** instead of Resume — because the button that says Resume must
never be a button the server refuses.

Two things worth keeping in mind if you touch this:

- **The deadline can pass while the screen is open.** Nothing special is needed for that: the
  projection re-evaluates every second from absolute timestamps, so the screen flips to "Session
  Closed" on its own, the same way the countdown rolls between questions.
- **The timeouts are what make the walk reachable at all.** The activity timeout is deliberately
  no shorter than the longest catch-up the walk could perform; when it was shorter, this entire
  screen was unreachable in production. That constraint is a decision with its own write-up:
  [`../adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md`](../adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md).

### The projection is a prediction, never an authority

`projectResume` replays `ResolveAndResumeAsync` step for step — the comments in it carry that
function's step numbers. It exists to make the screen honest, and it decides nothing:

**The server redoes the entire walk on resume, and its answer is the one that counts.** If the two
ever disagree, the server is right and `resume-projection.ts` is the bug.

That clause has been cashed once already, and not in the way it anticipates. The disagreement was
not a drifted number inside the walk — it was a whole step of `ResolveAndResumeAsync` that this
file did not model (Step 0 above). Worth remembering when reading the list below: **"replays it
step for step" is only a safety property if you have all the steps.**

That is not a disclaimer; it is what makes the feature safe. Nothing is submitted from this screen,
so the worst a drifted prediction can do is show a number that is a second off — never cost the
player a question.

Three details in there are copied deliberately and are easy to "clean up" into a mismatch:

- **`elapsed <= timeLimit` resumes the question.** Not `<`. One second either side of that line is
  the difference between keeping a question and scoring zero on it.
- **Seconds truncate, they don't round.** The server hands back `limit - (int)elapsed`.
- **After the current question expires, the walk restarts from the front of the list.** So an
  unanswered question ordered *before* the one in flight is burned before the ones after it. That
  is not obviously intended, but it is what resume does, and a screen that predicted something
  tidier would be lying about it.

If any of those change in `QuizSessionService`, they change here in the same commit.
`__tests__/resume-projection.test.ts` is written as the server's rules rather than the function's
branches, with the numbers sitting on each boundary, so a drift shows up as a named failure.

### The clock, and why nothing counts ticks

`useResumeProjection` is built on the same model as `QuizTimer` and for the same reasons — read
[`quiz-timer.md`](./quiz-timer.md) first if you are changing it:

- **Everything is re-derived from absolute timestamps.** No tick is load-bearing. A backgrounded
  phone or a throttled tab costs nothing, because the next tick computes the right answer from
  scratch and the screen catches up in one frame. This is not a theoretical concern: mobile
  browsers freeze JS timers in background tabs, and this screen is one a player is *especially*
  likely to leave open.
- **Device clock drift is corrected.** The offset between `serverTimeUtc` and the device's
  `Date.now()` is measured once and subtracted from every subsequent reading, for the same reason
  multiplayer re-measures skew every round.
- **The effect depends on primitives and the server payload only.** No callbacks, no derived
  objects. The freeze documented in `quiz-timer.md` — a countdown restarting faster than its own
  interval could fire — came from exactly that.

Two deliberate differences from `QuizTimer`: the interval is 1000ms rather than 250ms (whole
seconds on screen, nothing load-bearing for scoring), and there is no audio. A ticking sound on a
menu screen would be alarming rather than informative.

### No countdown when no clock is running

`nextChangeAtMs` is null when nothing is decaying — a session created but never served a question,
or one whose tracked question has since been answered. The server clears its tracking in that case
and resumes on the first pending question at full time.

The screen renders a still frame there, deliberately. A countdown would be inventing urgency the
server does not have, and this screen's whole job is to stop doing that.

---

## Rendering notes

- **Flat `bg-background`.** The screen used to paint two radial gradients behind the card via an
  inline `style`. It was the only screen doing so, it did not follow the theme, and it made the
  card look like it belonged to a different app.
- **The ring is not `QuizTimer`.** `QuizTimer` owns its own anchored deadline and calls `onTimeUp`.
  Pointed at this screen it would be a second clock racing the projection, and the two would
  disagree the moment either was throttled. `LiveQuestionClock` is a readout: it is handed numbers
  and counts nothing. It borrows `QuizTimer`'s 25% / 10% colour thresholds so a question looks
  equally urgent on both screens.
- **The progress bar has two segments.** Answered questions are worth points; expired ones are
  worth zero and the player can no longer do anything about them. One bar reading "8 / 12" for both
  would hide the only fact on this screen worth acting on.
- **The Resume button is a plain primary `Button`.** It was the last `variant="fancy"` in the
  codebase; that variant, its `fancyColors` prop, the `FancyButtonColors` type, the `.fancy-button`
  CSS and `GoBackButton`'s never-used `"fancy"` branch all went with it.
- **`QuizPage` renders `error` BEFORE `existingActiveSession`, and the order is load-bearing.**
  `handleResumeSession` sets `error` when the resume call fails, but it only clears
  `existingActiveSession` on success — so with the branches the other way round, a failed resume
  re-rendered *this same screen*. The spinner stopped, nothing else changed, and the player was
  left pressing a button that had already 500'd. Nothing appeared in the UI at any point.

  This is worth more than a note about one file, because it is not an error-handling gap: the
  hook set the error correctly, `ErrorScreen` existed and worked, and every layer looked healthy
  in isolation. A stale branch above the error branch is enough to make all of that invisible.
  **When a screen has a "special state" branch, that branch is a filter on every error the page
  can raise** — so it belongs below them, not above. `handleResumeSession` now also drops the
  session on failure, which is belt to that braces.

`active-session-view.stories.tsx` covers each state — including `WithoutLiveClock`, where
`resumeState` is absent and the screen degrades to the static snapshot it used to be. The stories
anchor their timestamps to `Date.now()`, so leaving one open really does run the countdown out.

## Related

- [`quiz-playing-architecture.md`](./quiz-playing-architecture.md) — where this screen sits in the
  play flow, and who decides to show it.
- [`quiz-timer.md`](./quiz-timer.md) — the in-game countdown, and the re-render bug that shaped how
  both of these are written.
- [`quiz-editing.md`](./quiz-editing.md) — why `pendingQuestions` is filtered to the session's
  pinned quiz version.
- [`quiz-grading.md`](./quiz-grading.md) — what a `TimedOut` answer is worth.
