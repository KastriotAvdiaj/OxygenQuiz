# Quiz session lifecycle: resume, abandonment, starting fresh

**This describes current behaviour.** How a single-player `QuizSession` moves between states, what
happens while nobody is playing it, and what the two buttons on the "Session In Progress" screen
actually do. For how a question is rendered and answered, see
[`quiz-playing-architecture.md`](./quiz-playing-architecture.md); for the timer itself, see
[`quiz-timer.md`](./quiz-timer.md).

---

## 1. Nothing advances while you are away

This is the design decision everything else follows from, and it surprises people.

**There is no background process moving a live session forward.** No job ticks the clock, expires
the current question, or advances to the next one. A session you walk away from sits exactly where
you left it: same `CurrentQuizQuestionId`, same answer count, indefinitely.

The catch-up is **arithmetic performed at resume time**, in
`QuizSessionService.ResolveAndResumeAsync`:

1. Was the question you were on still within its time limit? Resume it, with the remaining time
   adjusted for how long you were gone.
2. Otherwise, write a `TimedOut` answer for it and carry the leftover seconds forward as
   *overflow*.
3. Walk the remaining questions in order, timing out each one whose entire window the overflow
   covers, until one is left with time on it. Resume there.
4. If the overflow swallows every remaining question, complete the session and send the player to
   their results.

So a player who leaves on question 1 of 8 and returns much later sees `0 / 8` on the way in and
lands on their results — or on question 4 — the moment they press Resume. **The progress shown on
the "Session In Progress" screen is the state as stored, not a prediction of what resuming will
compute.** That is why it can read `0 / 8` for a session that is, in effect, over.

Doing it this way rather than with a ticking job means the arithmetic runs once, when someone
actually needs the answer, instead of continuously for every abandoned session in the database.

## 2. The states

A session is one row, and its state is a combination rather than an enum:

| State | `IsCompleted` | `AbandonedAt` | How it got there |
|---|---|---|---|
| Active | `false` | `null` | Created, being played |
| Finished | `true` | `null` | Last answer submitted — `SubmitAnswerService.CheckAndCompleteQuizAsync` completes it server-side; no client call is involved |
| Abandoned | `true` | set | Timed out (see §3), or the player pressed Start Fresh (`UserInitiated`) |

**Abandoned sessions are "completed".** They carry `AbandonmentReason` and `AbandonedAt` to
distinguish them, but they share the `IsCompleted` flag with genuine finishes — which is why
`abandoned` is a separate count in the quiz analytics rather than being derivable from
`IsCompleted` alone.

Guest sessions never reach the abandoned state: they are **deleted**, rows and answers both. See
[`../auth/guest-play.md`](../auth/guest-play.md).

## 3. Abandonment happens two ways

**Lazily**, when someone touches the session — `GetActiveSessionForUserAsync` (the player comes back
to that quiz), `ResolveAndResumeAsync` (on resume), or the admin-only
`POST /QuizSessions/cleanup`.

**On a timer**, via `SessionAbandonmentSweep` — a hosted service that calls the same
`ISessionAbandonmentService.CleanupAbandonedSessionsAsync` every `AbandonmentSweepMinutes`
(default 5; set it to 0 to disable the sweep and keep only the lazy paths).

The sweep exists because lazy abandonment only ever fires for a player who **comes back**. Someone
who never returns left a row at `IsCompleted = false` forever — counted as neither completed nor
abandoned, which is precisely the population `completionRate` is computed against.

> A `QuizSessionCleanupService` existed for this and was never registered, so it had never run. It
> was deleted rather than wired up: it predated `AbandonmentReason` and guest sessions, so it
> stamped neither and did not delete guest rows. Turning it on would have produced a second, wrong
> kind of abandoned session. `SessionAbandonmentSweep` owns only the schedule; the rules stay in
> `ISessionAbandonmentService`, shared with the lazy paths.

**The timing rules** live in `SessionAbandonmentService.CalculateTimeoutsAsync` and are derived from
the quiz rather than fixed: a total timeout (the sum of the pinned version's question limits plus a
per-question buffer, times a percentage margin) and an activity timeout (the longest single question
times a multiplier, plus a buffer). All configurable on `QuizSessionOptions`.

## 4. The two buttons

Both live on the "Session In Progress" screen (`quiz-page.tsx`, `ActiveSessionScreen`), which is
shown when session creation reports that an active session already exists.

**Resume** → `POST /quizsessions/{id}/resolve-and-resume`. Runs the catch-up in §1. Returns either
the question to resume on, or `IsQuizComplete` — in which case the client navigates to the results,
replacing history.

**Start Fresh** → `POST /quizsessions/{id}/abandon-and-restart`. Abandons the old session
(`UserInitiated`) and creates a new one in the same transaction. Carries the `shareToken` through,
because the new session is authorized from scratch and an Unlisted quiz reached by share link would
otherwise be refused.

**Both are idempotent with respect to an already-finished session**, and both had to be taught
that:

- Resume filtered on `!IsCompleted` when loading the session, so an already-abandoned session came
  back `null` and returned a validation failure — the player asked "where am I in this quiz?" and
  was told the quiz did not exist. It now returns the completed result, so the client can do the
  one useful thing and show the results.
- Start Fresh refused outright with "Existing session is already completed." An old session that is
  already finished is not an obstacle to starting a new one; it is the normal state of the thing
  being replaced. Abandoning is now skipped when it has already happened and the method proceeds to
  create the new session.

Both mattered more once the sweep started marking sessions on a timer: the "you came back to a
session that has since been abandoned" path went from rare to routine.

### Why the screen can disagree with the server

The screen is built from a **list read** (`findActiveSessionForQuiz` filters `!isCompleted` over the
user's recent sessions), and the session can be abandoned between that read and the button press —
including by the very lazy-abandonment path the surrounding requests trigger. So the screen can
briefly claim a session is in progress when the server already considers it finished.

That disagreement is not itself preventable without making the list read authoritative. What is
preventable is failing loudly at the user: with both endpoints idempotent, the first click resolves
the disagreement — Resume goes to the results, Start Fresh starts the new attempt — instead of
returning an error about a state the player never chose.

## 5. Failures must be visible on this screen

`quiz-page.tsx` renders the active-session branch **before** the error branch, and the resume and
restart handlers set `error` without clearing `existingActiveSession`. So an error raised by this
screen's own buttons set a message that nothing could render, and the button looked dead.

Two rules follow, and breaking either reproduces "the button does nothing":

- **This screen renders its own errors.** It receives `error` and shows it inline, above the
  actions. Do not rely on the `ErrorScreen` below — it is unreachable while an active session is
  set.
- **This screen owns its own pending state.** `useQuizSession`'s `isInitializing` is read from
  `initializationRef.current`, a ref. A ref is right for the re-entrancy guard it primarily serves,
  but it triggers no render, so it can never drive a spinner: the value flips and flips back inside
  one async call, with no render in between. `ActiveSessionScreen` tracks its own `isBusy` around
  both actions.
