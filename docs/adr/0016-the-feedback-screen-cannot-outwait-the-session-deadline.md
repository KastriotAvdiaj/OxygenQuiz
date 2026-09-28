# 16. The feedback screen cannot outwait the session deadline

Date: 2026-09-26
Status: Accepted

## Context

A single-player session is abandoned at the earlier of two deadlines (`SessionTimeouts.Calculate`).
The one that matters here is the **total** deadline, measured from the session's start:

```
(Σ question limits + QuestionBufferSeconds per question) × (1 + TotalTimeoutBufferPercentage)
```

The per-question clock stops between questions, but this one does not. Anything the client does
between questions — the instant-feedback screen and its auto-advance countdown — is spent out of
the per-question buffer (5 s), and the countdown had always been 3 s, so it fit.

Question explanations ([question-explanations.md](../quiz/question-explanations.md)) are shown on
that screen. The first version stopped auto-advancing while one was on screen and waited for Next.
That broke the fit with no error anywhere: ten 5-second questions give a 150 s deadline
((50 + 10 × 5) × 1.5), and a player who used each question's time and read each explanation for
twelve seconds needed 170 s. The
next request after the deadline finds the session abandoned — the player is thrown out mid-quiz for
reading.

Alternatives considered:

- **Raise `QuestionBufferSeconds` for everyone.** It is global, so every quiz — including those with
  no explanations, and every quiz without instant feedback, where nothing is read between questions
  — would get slack it can't use, loosening the cap for all of them to fix a few.
- **Stop the session clock while the feedback screen is up.** Needs the server to know when the
  client is showing feedback — a new request pair per question, and a clock a client could hold
  paused forever.
- **Keep the pause, drop the deadline for sessions with explanations.** Removes the cap that reaps
  sessions nobody will come back to.

## Decision

**The client may hold the feedback screen for at most what the deadline sets aside for it, and the
server says how much that is.**

1. **Slack per explained question.** `ExplanationReadSeconds` (10 s) is added to a question's share
   of the deadline when it has an explanation **and** the quiz gives instant feedback — the only
   case where one is read between questions. Summed per question, so a mixed quiz gets exactly as
   much as it has explanations, and a quiz without any is unchanged.
2. **The server sends the number.** `InstantFeedbackAnswerResultDto.ReadingAllowanceSeconds` carries
   `ExplanationReadSeconds` whenever it carries an explanation. The client does not hold a copy.
3. **The client waits for the explanation's length, capped by the allowance.** Auto-advance comes
   back: about 200 words a minute plus a beat, never under the default 3 s, never over the
   allowance. A result without an allowance (an older server) keeps the default.

## Consequences

- **The two numbers can't drift**, because there is only one of them. Raising
  `ExplanationReadSeconds` lengthens the deadline and the longest wait together.
- **The deadline depends on question content now**, not only on limits, so the timeout query reads
  whether each question has an explanation. It ignores query filters to do so: the sweep runs with no
  signed-in user, and the visibility filter would hide the Private questions quizzes are built from,
  under-counting the deadline — the direction that costs a player their session.
- **Only ever more generous.** The allowance feeds the activity timeout too, which keeps ADR 0008's
  invariant (never shorter than the catch-up walk's reach) in the safe direction.
- **Editing an explanation mid-session moves that session's deadline.** It is recalculated on every
  check, and the client only waits when the explanation actually arrived with the result, so the
  deadline can only be short of the client's wait if an explanation is added and removed within one
  question — not worth guarding.
- **This constrains the feedback screen.** Anything else that holds it — a second panel, a longer
  animation — spends the same budget and needs slack of its own, sent the same way.
