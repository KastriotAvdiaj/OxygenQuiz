# The question timer

`src/pages/Quiz/Sessions/components/quiz-taking-process/quiz-timer.tsx` — one component, rendered
by both modes:

| Mode | Call site | `initialTime` comes from |
|---|---|---|
| Singleplayer | `question-display.tsx` | `question.timeRemainingInSeconds` (server, per fetch) |
| Multiplayer | `multiplayer-question-view.tsx` | derived from the round's `deadlineUtc` (server, per round) |

It is a **display**. It has never been the authority on whether an answer was in time, and must
never become one: singleplayer grades against `CurrentQuestionStartTime` in `SubmitAnswerService`,
and multiplayer against `session.QuestionDeadlineUtc` in `QuizHub.SubmitAnswer`. Everything below is
about keeping the number on screen honest, not about correctness of scoring.

---

## The model

One idea: an **anchored deadline**. `deadlineRef` holds the `Date.now()` value at which time runs
out, and the displayed number is always recomputed from it. Nothing counts ticks, and no tick is
ever load-bearing — a tick that doesn't fire costs nothing, because the next one derives the right
answer from scratch.

That falls out of a constraint the app can't avoid: **mobile browsers freeze JS timers in
backgrounded tabs.** A decrementing interval silently pauses when the player switches apps, so the
display drifts ahead of a server that never stopped counting. Deriving from a deadline means time
spent away is simply counted, and an already-expired question fires `onTimeUp` the moment the tab
wakes. `visibilitychange` is wired to the same `sync()` as the interval so the catch-up is
immediate rather than up to 250ms late.

The interval runs at 250ms — cheap, and it means the display recovers quickly once a throttled
browser starts firing timers again.

## The two rules that keep it working

**1. The deadline is anchored exactly twice: on a new question, and on resume from pause.**

`initialTime` changing is what "a new question" means to this component, and it is the only thing
allowed to anchor from scratch. Resume shifts the existing deadline forward by the measured pause
duration — it does **not** re-derive it from the displayed value. That distinction matters because
the display is `Math.ceil`'d: re-anchoring from it rounds up, and hands the player back up to a
second every time it happens.

**2. The countdown effect depends on primitives only — `[initialTime, isPaused]`.**

`onTimeUp` and `onTick` live in refs and are deliberately absent from the dependency list. A
countdown that restarts whenever its parent re-renders is a countdown at the mercy of unrelated
state, and both call sites hand it a callback whose identity changes on every render (multiplayer
wrote an inline arrow; singleplayer's `handleTimeUp` is memoised against an `onSubmit` prop it does
not control).

If you add a dependency to that effect, it has to be a primitive that genuinely means "restart the
countdown". Anything else reintroduces the failure below.

## What went wrong (2026-08-02)

Clicking a header link during a multiplayer match froze the timer on screen. Hold the click for a
minute and the number never moved — while the server ran the question out and scored it as
unanswered.

The chain:

1. `useLobbyConnection` arms `useNavigationGuard(hasJoined)`, so React Router's blocker is armed for
   the whole session, matches included.
2. The dialog that resolves a blocked navigation was rendered only inside `<LobbyPageView>` — and
   `MultiplayerLobbyPage` early-returns `<MultiplayerGame>` before reaching it. So mid-match the
   blocker fired, rendered nothing, and stayed stuck in `blocked` with no `proceed()` or `reset()`
   reachable.
3. Every further click produced a new blocker object, re-rendering the page and the whole game
   subtree.
4. `<QuizTimer onTimeUp={() => setTimedOut(true)}>` gave a fresh callback identity each time, which
   changed `handleTimeUp`, which was in the countdown effect's dependency list.
5. The effect tore down its interval and **re-anchored the deadline to `now + <rounded display
   value>`** on every one of those renders. Clicking faster than 250ms meant `sync()` never ran at
   all; even when it did, the deadline had just been pushed back out.

So a UI affordance with no relationship to the timer could stop it. Three separate things had to be
wrong at once, which is why the fix is at all three layers: the dialog is now rendered in both
branches of `MultiplayerLobbyPage`, the call site memoises its callback, and — the part that
actually makes this class of bug impossible — the timer no longer depends on callback identity or
re-anchors outside the two cases above.

## Clock skew (same day)

A 30-second question would sometimes open at 32 or 34.

`MatchOrchestrator` sends `QuestionDeadlineUtc = UtcNow + limit` as an absolute timestamp, and the
client was computing `deadline − Date.now()`. That subtraction is only meaningful if the two
machines agree on the time, and a phone whose clock has drifted a few seconds doesn't. The player
saw the drift as free time.

`useMatch` now measures the offset from the same event. The deadline *is* `serverNow + limit` at
send, so `deadline − limit − Date.now()` is the server's clock minus ours, and
`multiplayer-question-view` corrects with it before computing the remaining time. It is
re-measured every question rather than cached for the match, because a device clock can be
corrected by NTP mid-match and a stale offset is worse than none.

Network latency lands in the same number, in the player's favour — a 100ms flight reads as 100ms of
skew and grants 100ms extra. That's the right direction to be wrong in, and it is bounded by a
`Math.min(limit, …)` ceiling so no arithmetic here can ever promise more time than the question is
worth. The server's deadline check is the authority regardless, so the failure mode to avoid is a
display that *over*-promises: that's the one that produces an answer the player believes was in
time and the server rejects.

## Tests

`src/pages/Quiz/Sessions/components/quiz-taking-process/__tests__/quiz-timer.test.tsx`, with
Vitest fake timers driving `Date.now()` as well as the interval — a deadline-anchored countdown
isn't testable otherwise.

The load-bearing case re-renders the component every 100ms with a fresh inline `onTimeUp` and
asserts the display still moved. That is the only shape that catches this class of bug: a frozen
countdown renders perfectly valid markup, so nothing static can see it.

## If you touch this

- Don't add non-primitive dependencies to the countdown effect.
- Don't anchor the deadline anywhere except a new question or a resume.
- Don't derive a new deadline from `timeLeft` — it's rounded.
- Treat "the timer looks frozen / gains time" as a re-render question first. The component is
  correct in isolation; it has now been broken twice by what its parents do.
- Verify with a backgrounded tab (switch apps for longer than the limit) as well as on screen.

## Related

- [`quiz-grading.md`](./quiz-grading.md) — how elapsed time becomes points, and why the server
  re-derives it.
- [`multiplayer.md`](./multiplayer.md) — the match loop and the events this reads.
- [`../RESPONSIVE.md`](../RESPONSIVE.md#backgrounded-tabs--timers-mobile) — the wall-clock rule as a
  general mobile constraint.
