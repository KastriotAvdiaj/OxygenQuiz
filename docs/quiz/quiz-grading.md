# Quiz Answer Submission & Grading

How a live (single-player) quiz session serves questions, accepts answers, and grades/scores
them. Multiplayer reuses the same scoring helper (see the end).

## The live session loop

A session walks one question at a time. The client polls/drives these endpoints
(`QuizSessionsController`, route prefix `api/QuizSessions`):

1. **Create** — `POST /api/QuizSessions` `{ quizId, userId }` → starts a session. The quiz must be
   published/active or you get a "not available" error.
2. **Serve next question** — `GET /api/QuizSessions/{id}/next-question` → picks the next unanswered
   `QuizQuestion` by `OrderInQuiz`, stamps `CurrentQuizQuestionId` + `CurrentQuestionStartTime`, and
   returns a `CurrentQuestionDto`.
3. **Submit** — `POST /api/QuizSessions/answer` with a `UserAnswerCM` (see below).
4. **State recovery** — `GET /api/QuizSessions/{id}/current-state` returns whether the session is
   `InProgress` (with the active question + remaining time), `BetweenQuestions`, or `Completed`.
5. **Results** — `GET /api/QuizSessions/{id}/results` returns the full `QuizSessionDto`
   (all answers); for non-instant quizzes it waits up to `maxWaitSeconds` for background grading.

`GetNextQuestionAsync` ([QuizSessionService.cs](../OxygenBackend/QuizAPI/Controllers/Quizzes/Services/QuizSessionServices/QuizSessionService.cs))
sets the question-start clock from the **app clock** (a captured `DateTime.UtcNow`, not a SQL
`now()` inside `ExecuteUpdate`) so it stays consistent with `SubmittedTime` — otherwise a DB clock
running ahead of the app makes a fast answer record negative elapsed time.

### What the client sees (`CurrentQuestionDto`)

```
QuizQuestionId, QuestionText, TimeLimitInSeconds, TimeRemainingInSeconds,
QuestionType, AllowMultipleSelections, Options[]
```

`Options` deliberately **omit correctness** (the answer key is never sent to the player):

| Question type | `Options` |
|---|---|
| MultipleChoice | the real options as `{ ID, Text }` |
| TrueFalse | synthetic `{ 1: "True" }`, `{ 2: "False" }` (ids defined once in `Models/Questions/TrueFalseOption.cs`) |
| TypeTheAnswer | empty (free-text input) |

## Submitting an answer (`UserAnswerCM`)

```
SessionId, QuizQuestionId, SelectedOptionId?, SubmittedAnswer?, IsTimedOut, ClientElapsedMs?
```

How each type fills it:

| Type | Fields |
|---|---|
| MultipleChoice (single) | `SelectedOptionId` = the chosen option id |
| MultipleChoice (multi, `AllowMultipleSelections`) | `SubmittedAnswer` = **comma-separated** chosen ids, e.g. `"9,10"` (`SelectedOptionId` null) |
| TrueFalse | `SelectedOptionId` = `1` (True) or `2` (False) — synthetic ids from `TrueFalseOption`; the server converts the id to `SubmittedAnswer` `"True"`/`"False"` |
| TypeTheAnswer | `SubmittedAnswer` = the typed text |
| Timed out (client) | `IsTimedOut = true` |
| Every type | `ClientElapsedMs` = think time the client measured with `performance.now()` (see [Latency-compensated timing](#latency-compensated-timing)) |

> **Why the CSV for multi-select?** It reuses the existing `SubmittedAnswer` string channel, so
> multi-select needed no new submit field and no schema migration. `UserAnswer` still stores one
> `SelectedOptionId` (single) or the CSV in `SubmittedAnswer` (multi).

### Submission flow (`SubmitAnswerAsync`)

1. Validate the session exists, isn't completed, and that the submitted `QuizQuestionId` matches the
   session's current question.
2. Compute `serverElapsed = now − CurrentQuestionStartTime`. It's a **timeout** if
   `serverElapsed > TimeLimitInSeconds + GracePeriodSeconds` **or** the client set `IsTimedOut`.
   The timeout decision always uses the raw server clock.
3. Compute the **effective** elapsed for scoring (`QuizTiming.EffectiveElapsed`) and stamp
   `SubmittedTime = QuestionStartTime + effectiveElapsed`, `QuestionStartTime = CurrentQuestionStartTime`.
4. Then:
   - **Timed out** → status `TimedOut`, score `0`.
   - **Instant-feedback quiz** (`Quiz.ShowFeedbackImmediately`) → graded **synchronously** and the
     result (status, score, correct-answer info) is returned in the response.
   - **Otherwise** → status `Pending`; after the transaction commits, a **Hangfire background job**
     grades it (`ProcessAnswerGradingAsync`, with retries).
5. When the answer count reaches the quiz's question count, the session is marked complete.

## Grading rules (`AnswerGradingService.DetermineCorrectnessAsync`)

| Type | Correct when… |
|---|---|
| MultipleChoice (single) | the one chosen option is a correct option |
| MultipleChoice (multi) | **all-or-nothing**: the chosen set exactly equals the correct set — every correct option and no incorrect ones (order-independent) |
| TrueFalse | submitted `"True"`/`"False"` equals the question's `CorrectAnswer` |
| TypeTheAnswer | delegated to `TypeTheAnswerMatcher.IsCorrect` — see [`typed-answer-matching.md`](./typed-answer-matching.md) |

Multi-select selections are parsed back out of `SubmittedAnswer` (the CSV) via
`ParseSelectedOptionIds`.

Whether 2-of-3 on a multi-select should score at all is an open question — the trade-offs and the
(substantial) cost of moving `IsCorrect` off a bool are worked through in
[`proposals/partial-credit.md`](../proposals/partial-credit.md). Nothing is decided.

**Typed answers are matched in one shared place.** `QuizAPI/Services/Grading/TypeTheAnswerMatcher.cs`
handles trimming, case sensitivity, `AcceptableAnswers` and `AllowPartialMatch`, and is called by
both this grader and the question-preview grader (`TestQuestionService`) so a preview can't disagree
with real play. Before 2026-07-31 the two implemented it separately and **neither honoured
`AllowPartialMatch`**, despite the builder offering it as a switch.

## Scoring

Correct answers earn **speed-weighted** points — faster answers score higher, within the
question's `TimeLimitInSeconds` and its `PointSystem` multiplier (`Standard`, `Double`,
`Quadruple`). The formula lives in `Services/Scoring/QuizScoring.PointsForCorrectAnswer` and is
shared by single-player, multiplayer, and practice/test questions so they stay in lockstep.
Incorrect, timed-out, or no-`SubmittedTime` answers score `0`. Each graded answer adds to
`QuizSession.TotalScore`.

```
timeRemaining = max(0, timeLimit − elapsed)
timeBonus     = (timeRemaining / timeLimit) × 0.5      // up to +50%
points        = round(1000 × (1 + timeBonus) × multiplier)   // floor of 1
```

An instant correct answer is worth **1500**, one that uses the entire limit is worth **1000**.

### Why the base is 1000, not 10

The base used to be `10`, with `(int)` truncation *before* the multiplier. That gave the entire
speed range **six possible values (10–15)**: on a 30s question, one point covered a **6-second**
band, so answering in 1.2s and 5.9s scored identically — the speed bonus barely functioned as a
tiebreaker. Two changes fix it:

- **Scale up** — a 1000-point base gives ~100× the resolution. On a 30s question 0.1s is worth
  ~1.7 points; on a 10s question, 5 points.
- **Round once, at the end** — the multiplier is applied in `double` and rounded last, so `Double`
  and `Quadruple` questions no longer inherit a pre-truncated value.

Historical scores were recorded on the old scale. The
`20260728120000_RescaleScoresToHighResolutionBase` migration multiplies existing
`UserAnswer.Score` and `QuizSession.TotalScore` by 100 so past sessions stay directly comparable
with new ones. **The migration and the formula change must deploy together.**

### Latency-compensated timing

The scoring resolution above is only meaningful if the elapsed time being measured is the player's
*thinking*, not their connection.

**The problem.** The server can only observe two server-side moments: when it served the question
and when the answer arrived. That window contains a full round trip, so

```
serverElapsed ≈ trueThinkTime + RTT + renderTime
```

A player on 200ms ping loses ~0.4s of speed bonus on *every* question through no fault of their
own — several times larger than the sub-second differences the scoring change now resolves.
Increasing scoring precision without fixing this would have made ping *more* decisive, not less.

**The fix.** The client measures its own think time with a **monotonic clock**
(`performance.now()`, immune to wall-clock changes) from the moment the question renders to the
moment the answer is submitted, and reports it as `ClientElapsedMs`. The server then validates it
in `Services/Scoring/QuizTiming.EffectiveElapsed`:

| Check | Rationale |
|---|---|
| `clientElapsed > 0` | rejects missing/garbage values |
| `clientElapsed ≤ serverElapsed` | an honest client's window is strictly *inside* the server's — a larger claim is physically impossible |
| `serverElapsed − clientElapsed ≤ MaxLatencyCreditSeconds` (default 2s) | the gap is round trip + render; anything beyond that is a tampered client or a broken measurement |

Pass all three and the client's value is used for scoring; fail any and the server falls back to
its own window — exactly the old behaviour. `QuizSessionOptions.MaxLatencyCreditSeconds` tunes the
ceiling.

**What a cheater gains.** At most the latency credit itself — the same few points an honest player
on a bad connection legitimately gets back (≤ ~33 points on a 30s question). Claiming more than the
server window is rejected outright. This is the standard trade-off for a quiz game: full anti-cheat
(signed timestamps, attestation) costs far more than the exposure.

**What the client can never do:** talk its way out of a timeout. `IsTimedOut` and the grace-period
check run on the raw server clock, before and independently of any client-reported value.

`SubmittedTime` is persisted as `QuestionStartTime + effectiveElapsed` rather than the raw arrival
time, so the row is self-describing: instant grading, the Hangfire background grader, the results
review, and the profile stats all read `SubmittedTime − QuestionStartTime` and get the same think
time the answer was actually scored with.

Both play paths measure it the same way — `quiz-page.tsx` / `guest-quiz-page.tsx` stamp a ref when
the question renders; multiplayer's `use-match.ts` stamps it on the `QuestionStarted` event and
passes the delta through `SubmitAnswer(sessionId, answer, clientElapsedMs)`.

Older clients that omit `ClientElapsedMs` keep working — they simply score on the server window.

## Instant feedback result (`InstantFeedbackAnswerResultDto`)

Returned from the submit call for instant-feedback quizzes:

```
Status, ScoreAwarded, IsQuizComplete, TimeSpentInSeconds,
CorrectOptionId, CorrectOptionIds, CorrectAnswer, AcceptableAnswers
```

The correct-answer fields are populated **only when the answer was wrong or timed out** (so a
correct answer never reveals more than needed). For multiple-choice, `CorrectOptionIds` lists
**every** correct option (used to highlight all of them on multi-select); `CorrectOptionId` is the
first one, kept for single-answer clients.

For **TrueFalse**, correctness is reported via `CorrectAnswer` (`"True"`/`"False"`) — **not**
`CorrectOptionId`, which is left null for T/F. The client highlights the correct option by matching
that string against the option text. (Comparing against `CorrectOptionId` was a past bug: it's never
populated for T/F, so the correct option was never highlighted on a wrong answer.)

## Timeouts & abandonment

- A client-side timer expiry submits with `IsTimedOut = true`; the server also enforces its own
  clock check, so a timeout is recorded regardless of latency.
- Questions the user never reached (e.g. a session resumed after expiry) get an auto-`TimedOut`
  `UserAnswer` with `SubmittedTime = null` via `CreateTimedOutAnswer`.
- Idle sessions are auto-abandoned (`IsSessionAbandonedAsync`) — flagged `IsCompleted = true` with
  an `AbandonedAt` timestamp and an `AbandonmentReason`. **Abandoned sessions are not counted as
  completions** in analytics/reports (see [reports.md](reports.md)).

## Key files

| Concern | File |
|---|---|
| Endpoints (serve / submit / state / results) | `Controllers/Quizzes/QuizSessionsController.cs` |
| Session loop, submit orchestration, timeouts | `Controllers/Quizzes/Services/QuizSessionServices/QuizSessionService.cs` |
| Correctness + score, instant & background grading | `Controllers/Quizzes/Services/QuizSessionServices/AnswerGradingService/AnswerGradingService.cs` |
| Typed-answer matching (shared with the preview grader) | `Services/Grading/TypeTheAnswerMatcher.cs` (+ `QuizAPI.Tests/Grading/`) |
| Speed-weighted scoring formula | `Services/Scoring/QuizScoring.cs` |
| Latency compensation (which elapsed is scored) | `Services/Scoring/QuizTiming.cs` |
| Abandonment detection / cleanup | `Controllers/Quizzes/Services/QuizSessionServices/AbandonmentService/SessionAbandonmentService.cs` |
| DTOs (`CurrentQuestionDto`, `UserAnswerCM`, results) | `DTOs/Quiz/QuizSession-UserAnswerDTO.cs` |
| Play UI (per question type) | `src/pages/Quiz/Sessions/components/quiz-taking-process/` |

## Multiplayer

Live multiplayer (`Services/QuizSessionServices/MatchOrchestrator.cs`) runs its own match loop but
builds the same `UserAnswer` shape and grades through the same `QuizScoring` helper, so correctness
and scoring match single-player. It applies the same latency compensation: `QuizHub.SubmitAnswer`
stores the player's reported `ClientElapsedMs` on the `RoundAnswer`, and `BuildUserAnswer` runs it
through `QuizTiming.EffectiveElapsed` at grading time. The round deadline stays on the server
clock, so a client report can never resurrect a late answer.

For the match loop around this — lobby lifecycle, the round timing constants, and the hub/event
API — see [multiplayer.md](multiplayer.md).

## Where scores are read back

Completed sessions and their answers feed the profile history and player statistics —
see [user-stats-history.md](user-stats-history.md).
