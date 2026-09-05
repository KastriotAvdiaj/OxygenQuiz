# Quiz-Playing Architecture (how a quiz is rendered and answered)

> For anyone — human or agent — about to change how quizzes are played. Read this first; it saves you
> from editing the wrong file or duplicating logic that already exists.
> Covers the **singleplayer** flow in detail and notes where **multiplayer** reuses the same parts.

---

## 1. The 60-second mental model

Playing a quiz is a top-down stack. State and the backend call live at the top; the bottom is dumb UI
that renders one question and reports the answer back up:

```
Router.tsx
  └─ QuizPageRouteWrapper      logged-in vs guest, guest gating
       └─ QuizPage             THE CONTROLLER — the only place that talks to the backend
            │   useQuizSession()   session state (current question, last result, resume)
            │   useSubmitAnswer()  POST /QuizSessions/answer
            └─ QuizInterface    page layout: Next/Finish button, auto-advance, "complete" screen
                 └─ QuestionDisplay   per-question shell + the switch on questionType ↓
                    ├─ MultipleChoiceQuestion   pick option(s)
                    ├─ TrueOrFalseQuestion      pick true/false
                    └─ TypeTheAnswerQuestion    type text
                         └─ QuizSubmitButton    ONE shared submit button for all three
```

The golden rule: **answers flow up, state flows down.** A question-type component never calls the API.
It calls `onSubmit(...)`, which bubbles up to `QuizPage.handleSubmitAnswer`, which fires the mutation.

---

## 2. What each file does

All paths are under `src/pages/Quiz/Sessions/`.

| File | Role |
| ---- | ---- |
| `components/.../quiz-page-route-wrapper.tsx` | Entry point. Decides logged-in (`QuizPage`) vs guest (`GuestQuizPage`) and handles the one-free-guest-quiz gate. See `docs/auth/guest-play.md`. |
| `components/.../quiz-page.tsx` | **The controller.** Wires `useQuizSession` + `useSubmitAnswer`, owns `handleSubmitAnswer` / `handleNextQuestion`, and picks between the loading / error / active-session screens and `QuizInterface`. The only component that submits to the backend. Keeps `ErrorScreen` inline; the other two full-screen states live in their own files below. |
| `components/quiz-loading-view.tsx` | **THE loading screen** — a `SplitFlapText` board, no card. Sits one level above `quiz-taking-process/` and `quiz-results/` because both use it: `QuizPage` / `GuestQuizPage` while the session is created ("LOADING / YOUR QUIZ"), `QuizInterface` for the gap between two questions ("LOADING / QUESTION"), and both results wrappers ("LOADING / RESULTS"). Change the loading look here and every waiting moment follows. Storied in `quiz-loading-view.stories.tsx`. |
| `components/.../active-session-view.tsx` | The **"Session In Progress"** fork — Resume / Start Fresh / Back, shown when the player already has an unfinished session for this quiz. Presentational; `isLoading` disables both actions while either request is in flight. Storied in `active-session-view.stories.tsx`. |
| `../../hooks/use-quiz-session.ts` | The **state brain**: current question, last answer result, progress, resume / active-session logic. |
| `components/.../quiz-interface.tsx` | Page layout. Renders `QuestionDisplay`, the "Next / Finish" button, the auto-advance countdown, and the "Quiz Complete" screen. No answer logic. With a null `currentQuestion` it renders `QuizLoadingView` in place of the question, keeping the leave button and the layout — that is the between-questions gap, see §3b. |
| `components/.../question-display.tsx` | Per-question **shell + dispatcher**: timer, question card, media, "time's up" banner, instant-feedback panel, the double-submit guard, and the `switch (questionType)` that picks an input component. |
| `components/.../question-display-type-files/*.tsx` | The three **input components** (multiple-choice, true-or-false, type-the-answer). Each owns its own selection state and reports the answer via `onSubmit`. **Shared with multiplayer.** |
| `components/.../quiz-submit-button.tsx` | The **single Submit button** used by all three input components (and both modes). Owns styling, the loading spinner, the visibility rule, and the disabled logic. |
| `components/.../question-card.tsx` | The styled question-text card. Shared with the multiplayer match view. |
| `components/.../feedback-display.tsx`, `quiz-timer.tsx` | Instant-feedback panel and the countdown timer. **Shared with multiplayer**, and it has its own contract — anchored deadline, primitive-only effect dependencies. Read [`quiz-timer.md`](./quiz-timer.md) before changing it. |
| `api/submit-answer.ts` | `useSubmitAnswer` mutation → `POST /QuizSessions/answer`, then invalidates the current-state query. |
| `api/get-current-state.ts`, `get-next-question.ts`, … | The rest of the session API surface. |

### Multiplayer reuses the leaves
`src/pages/Quiz/Multiplayer/components/game/multiplayer-question-view.tsx` imports the same three
input components and the same `QuestionCard`, running the same `switch`. It bridges its own submit into
the shared `onSubmit(optionId, text)` signature. **So a change to a question-type component or the
submit button affects both singleplayer and multiplayer** — verify both when editing them.

---

## 3. The submit path, step by step

1. User picks/types an answer inside a question-type component (local `useState`).
2. They click **Submit** (the shared `QuizSubmitButton`) — or use a shortcut (double-click an option,
   or press Enter in type-the-answer).
3. The component calls `onSubmit(selectedOptionId, submittedAnswer?)`.
4. `QuestionDisplay.handleSubmit` wraps it with a **double-submit guard** (`hasSubmittedRef`) so a
   late click and a timer expiry can't both fire.
5. It bubbles to `QuizPage.handleSubmitAnswer`, which calls the `useSubmitAnswer` mutation
   (`POST /QuizSessions/answer`).
6. On success, `useQuizSession` updates; instant feedback shows, then `QuizInterface` auto-advances (or
   the user clicks Next/Finish).

Timeouts: `QuestionDisplay.handleTimeUp` submits `onSubmit(null, undefined, true)` once, shows the
"Time's Up" banner, and suppresses per-option red/green feedback for that question.

---

## 3a. Option order is decided at serve time

Answer options are **not** shown in the order they are stored. `EntityMappers.ToCurrentQuestionDto`
(single-player) and `MatchOrchestrator.LoadRoundQuestionsAsync` (multiplayer) both run them through
`DeterministicShuffle` before they reach the client.

This exists because stored order is authoring order, and authoring order is biased: measured
2026-09-01, **67.9% of stored questions had the correct answer first**, because that is how models
write them and nothing in the pipeline had an opinion about order. Full reasoning in
[`../adr/0006-answer-order-is-shuffled-at-serve-time.md`](../adr/0006-answer-order-is-shuffled-at-serve-time.md).

Three things to know before touching this:

- **The order is seeded, not random.** Single-player is seeded by session + quiz-question id, because
  this DTO is rebuilt on every poll, resume and reconnect — a plain `Random` would slide the options
  around while the player was reading them. Multiplayer seeds once per match so every player sees the
  same board. Do not "simplify" either to `Random` or to a `string.GetHashCode()` seed; both are
  covered by a pinned test that explains why.
- **Positions mean nothing; ids mean everything.** Submission is by `SelectedOptionId`, never by
  index. Any new client code that reasons about "the second option" is a bug waiting for the next
  reshuffle.
- **True/False is exempt** and stays True-then-False.

`Quiz.ShuffleQuestions` is applied at the same two seams, seeded the same way. It had been dead
since the initial migration — a column, a DTO field and a visible checkbox that no code ever read.

## 3b. The loading screen, and the gate that used to hide it

There is **one** loading component — `quiz-loading-view.tsx` — rendered from three places.
What decides which of them you are looking at is the pages' early-return gate, and that gate
used to be wrong.

**The bug.** `useQuizSession` derives:

```ts
const isInitialLoading =
  (!quizSession || !currentQuestion) && !error && !existingActiveSession;
```

and `fetchNextQuestion` clears the question **before** it requests:

```ts
setLastAnswerResult(null);
setCurrentQuestion(null);
```

`QuizPage` returned early on `isInitialLoading`, so every click of **Next** matched it. The
player got a full-screen card — no header, no leave button, the whole layout gone — and
`QuizInterface` was never rendered without a question, which made its own loading branch
dead code. `GuestQuizPage` had the identical gate.

**The fix.** Both pages now gate on the session alone:

```ts
if (!quizSession && !error) return <QuizLoadingView ... />;
```

So:

| Moment | Who renders it | Board reads |
| ------ | -------------- | ----------- |
| Creating / resolving the session | `QuizPage`, `GuestQuizPage` (full screen) | LOADING → YOUR QUIZ |
| Between two questions | `QuizInterface` (inside the quiz chrome — leave button and layout stay) | LOADING → QUESTION |
| Fetching the finished session | `QuizResultsRouteWrapper`, `GuestQuizResultsRouteWrapper` (full screen) | LOADING → RESULTS |

`isInitialLoading` is still returned by both hooks (the guest hook's tests use it) but is
marked `@deprecated` for gating: it means "no question on screen", which is not the same
question as "are we still starting up".

**Still dead, deliberately:** `QuizInterface`'s "Quiz Complete! / Preparing your results…"
branch needs `currentQuestion === null` **and** a `lastAnswerResult`, but `fetchNextQuestion`
clears both together and the complete-with-feedback path keeps the question on screen until
the user presses Finish. Nothing a player does reaches it.

**If you change the loading look:** edit `quiz-loading-view.tsx`, not the call sites. And
note `SplitFlapText` only animates on a phrase *change* — a single-entry `words` array
renders a board that never moves.

---

## 3c. Why the results page centres with `m-auto`

Both results wrappers used to open with `<div className="h-64 pt-[4rem]">`. `h-64` is a
**fixed 16rem**, so `QuizResults`' own `flex-1` had no flex parent to grow inside and no
height to grow into: the content spilled out of a 16rem box pinned under the header, and the
rest of the screen was dead background. That is the empty half of the screenshot in every
"results page looks unfinished" report.

The wrappers are now `flex flex-1 flex-col pt-[var(--header-height,4rem)]` — a real column
in the shell's viewport (the padding clears the OVERLAY header these routes use, read from
the shell's own variable rather than a hard-coded 4rem). `QuizResults` is `flex flex-1
w-full`, and its inner container centres with **`m-auto`, not `justify-center`**:

- Short content (the Overview tab) — auto margins absorb the free space on both axes, so the
  card sits in the middle of the screen.
- Tall content (Question Review with a dozen questions) — the free space is negative, auto
  margins resolve to 0, the content starts under the header and scrolls normally.

`justify-center` / `items-center` get the first case right and **clip the top** of the
second, which is why they are not used here.

---

## 4. Why there is ONE submit button now (and why there used to be three)

Each question-type component used to render its **own** copy of the Submit button — same styling, same
spinner, same visibility guard, same disabled logic. That's a DRY violation, and the copies had already
drifted (the multiple-choice button carried padding the others didn't). "Change the submit button"
meant editing three files and hoping you caught them all.

The fix separates two concerns that were tangled together:

- **Type-specific** (stays in each component): *what is the current answer, and is it valid?* Expressed
  as the `canSubmit` boolean and what `onSubmit` submits.
- **Shared** (now in `QuizSubmitButton`): *the button UI, spinner, label, when it's visible, and the
  disabled state.*

So a question-type component now ends with:

```tsx
<QuizSubmitButton
  onSubmit={submitSelection}
  canSubmit={selectedIds.length > 0}
  isSubmitting={isSubmitting}
  answered={isAnswered}
  isTimedOut={isTimedOut}
  hint={/* optional helper line */}
/>
```

### If you add a new question type
1. Create a component in `question-display-type-files/` that owns its selection state.
2. Report the answer with `onSubmit(optionId, text?)`; end with a `<QuizSubmitButton>`.
3. Add a `case` to the `switch` in **both** `question-display.tsx` (singleplayer) and
   `multiplayer-question-view.tsx` (multiplayer).

### Want to restyle the Submit button, spinner, or "Submitting…" text?
Edit **only** `quiz-submit-button.tsx`. All types and both modes update at once.

---

## 4a. Leaving, and why finishing replaces history

The play route hides the site header (it ate a row of viewport on phones and pushed the submit
button below the fold), so the quiz has to provide its own exits. There are two.

**`QuizLeaveButton`** sits at the top of `QuizInterface` and confirms before it goes. Leaving does
**not** abandon the session — no API call — so the player comes back to the existing "Session In
Progress" screen and can resume or start fresh. That is why the dialog says progress is saved
rather than warning about losing it; if leaving should ever abandon instead, the call and the
wording have to change together.

**Finishing navigates with `replace: true`**, in all seven places the play flow reaches a results
route. This is not a tidiness preference. `useQuizSession` creates a new session on mount, so while
the play entry stayed in history, one Back press from the results page silently began another
attempt — a player checking the quiz list found themselves a question into a quiz they had not
chosen to start. Replacing means Back from results goes to wherever they were before playing.

Anything new that sends a player from `/quiz/:quizId/play` to a results route must replace too. A
plain `navigate()` there reopens the hole.

## 5. Known rough edges (good first cleanups)

These are pre-existing and safe to tidy when you're in the area:

- **Dead/commented code** in `quiz-interface.tsx` (the `QuizProgress` header, unused props like
  `currentQuestionNumber` / `totalQuestions` / `completedAnswers`) and stray `// variant="fancy"`.
- **`console.log("Submitting answer")`** left in `api/submit-answer.ts` — drop before production.
- **True/False option IDs (fixed — kept here as a record).** `true-or-false-question.tsx` used to find
  its options with `id === 1` (true) / `id === 2` (false). Those are **synthetic** ids the API fabricates
  for T/F questions (a `TrueFalseQuestion` stores no options) — not database ids — but the `1`/`2`
  contract was duplicated as bare literals across `EntityMappers.ToCurrentQuestionDto` (send),
  `SubmitAnswerService.NormalizeTrueFalseAnswer` (grade), and the front-end, with nothing keeping them
  in sync. It's now defined once in `Models/Questions/TrueFalseOption.cs` and consumed by both backend
  sites; the front-end no longer hard-codes ids at all — it identifies the options by their text and
  submits whichever id the API sent. This also fixed a real bug: T/F feedback compared against
  `correctOptionId` (never sent for T/F), so the correct option wasn't highlighted on a wrong answer;
  it now keys off the `correctAnswer` ("True"/"False") string, matching how multiple-choice works.
- **A fuller refactor** is possible: `QuestionDisplay` already receives each type's current answer via
  the `onSelectionChange` channel (currently a no-op). Storing that would let `QuestionDisplay` render
  the single submit button itself and make the type components pure inputs. Not done yet — the shared
  `QuizSubmitButton` is the low-risk first step.
