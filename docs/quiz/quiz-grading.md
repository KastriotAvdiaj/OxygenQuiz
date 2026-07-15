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
SessionId, QuizQuestionId, SelectedOptionId?, SubmittedAnswer?, IsTimedOut
```

How each type fills it:

| Type | Fields |
|---|---|
| MultipleChoice (single) | `SelectedOptionId` = the chosen option id |
| MultipleChoice (multi, `AllowMultipleSelections`) | `SubmittedAnswer` = **comma-separated** chosen ids, e.g. `"9,10"` (`SelectedOptionId` null) |
| TrueFalse | `SelectedOptionId` = `1` (True) or `2` (False) — synthetic ids from `TrueFalseOption`; the server converts the id to `SubmittedAnswer` `"True"`/`"False"` |
| TypeTheAnswer | `SubmittedAnswer` = the typed text |
| Timed out (client) | `IsTimedOut = true` |

> **Why the CSV for multi-select?** It reuses the existing `SubmittedAnswer` string channel, so
> multi-select needed no new submit field and no schema migration. `UserAnswer` still stores one
> `SelectedOptionId` (single) or the CSV in `SubmittedAnswer` (multi).

### Submission flow (`SubmitAnswerAsync`)

1. Validate the session exists, isn't completed, and that the submitted `QuizQuestionId` matches the
   session's current question.
2. Compute `timeTaken = now − CurrentQuestionStartTime`. It's a **timeout** if
   `timeTaken > TimeLimitInSeconds + GracePeriodSeconds` **or** the client set `IsTimedOut`.
3. Stamp `SubmittedTime = now` and `QuestionStartTime = CurrentQuestionStartTime`.
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
| TypeTheAnswer | the text equals `CorrectAnswer` or any of `AcceptableAnswers`, honoring the question's `IsCaseSensitive` flag |

Multi-select selections are parsed back out of `SubmittedAnswer` (the CSV) via
`ParseSelectedOptionIds`.

## Scoring

Correct answers earn **speed-weighted** points — faster answers score higher, within the
question's `TimeLimitInSeconds` and its `PointSystem` multiplier (`Standard`, `Double`,
`Quadruple`). The formula lives in `Services/Scoring/QuizScoring.PointsForCorrectAnswer` and is
shared by single-player and multiplayer so they stay in lockstep. Incorrect, timed-out, or
no-`SubmittedTime` answers score `0`. Each graded answer adds to `QuizSession.TotalScore`.

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
| Speed-weighted scoring formula | `Services/Scoring/QuizScoring.cs` |
| Abandonment detection / cleanup | `Controllers/Quizzes/Services/QuizSessionServices/AbandonmentService/SessionAbandonmentService.cs` |
| DTOs (`CurrentQuestionDto`, `UserAnswerCM`, results) | `DTOs/Quiz/QuizSession-UserAnswerDTO.cs` |
| Play UI (per question type) | `src/pages/Quiz/Sessions/components/quiz-taking-process/` |

## Multiplayer

Live multiplayer (`Services/QuizSessionServices/MatchOrchestrator.cs`) runs its own match loop but
builds the same `UserAnswer` shape and grades through the same `QuizScoring` helper, so correctness
and scoring match single-player.
