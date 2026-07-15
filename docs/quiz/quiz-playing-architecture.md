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
| `components/.../quiz-page.tsx` | **The controller.** Wires `useQuizSession` + `useSubmitAnswer`, owns `handleSubmitAnswer` / `handleNextQuestion`, and renders the loading / error / active-session screens or `QuizInterface`. The only component that submits to the backend. |
| `../../hooks/use-quiz-session.ts` | The **state brain**: current question, last answer result, progress, resume / active-session logic. |
| `components/.../quiz-interface.tsx` | Page layout. Renders `QuestionDisplay`, the "Next / Finish" button, the auto-advance countdown, and the "Quiz Complete" screen. No answer logic. |
| `components/.../question-display.tsx` | Per-question **shell + dispatcher**: timer, question card, media, "time's up" banner, instant-feedback panel, the double-submit guard, and the `switch (questionType)` that picks an input component. |
| `components/.../question-display-type-files/*.tsx` | The three **input components** (multiple-choice, true-or-false, type-the-answer). Each owns its own selection state and reports the answer via `onSubmit`. **Shared with multiplayer.** |
| `components/.../quiz-submit-button.tsx` | The **single Submit button** used by all three input components (and both modes). Owns styling, the loading spinner, the visibility rule, and the disabled logic. |
| `components/.../question-card.tsx` | The styled question-text card. Shared with the multiplayer match view. |
| `components/.../feedback-display.tsx`, `quiz-timer.tsx` | Instant-feedback panel and the countdown timer. |
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
