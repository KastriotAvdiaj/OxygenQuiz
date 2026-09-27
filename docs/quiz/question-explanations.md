# Question explanations

An optional short "why" on a question, shown to a player **after** they answer it, so a quiz
teaches as well as tests. Added 2026-09-26.

## Optional, and staying that way

`QuestionBase.Explanation` is a nullable `varchar(1000)` (migration `AddQuestionExplanation`).
Existing questions are `null` and nothing back-fills them; a question without one plays exactly as
it did before. It is not required because a required field gets filled with "because it's correct",
which is worse than nothing, and because it would have blocked every import and every question
written before it existed.

"None" has exactly one representation: `null`. `QuestionExplanation.Normalize` trims and turns
blank into null on every write path (question create/update, the quiz AI import, the data-transfer
import), so an emptied textarea can't leave `""` behind to render as an empty box.

| Rule | API (the gate) | Client (fast feedback) |
|---|---|---|
| At most 1000 characters | `QuestionExplanation.MaxLength`; over it → `AppValidationException` (400) | `EXPLANATION_MAX_LENGTH` + `explanationSchema` in `src/common/question-explanation.ts` |
| Model-written text over the cap | cut, not rejected — `NormalizeAndTruncate` in `BuildAiQuestionEntity` | cut in `parse-ai-output.ts` (`cleanExplanation`) |
| Blank | stored as `null` | sent as `""`, normalised by the API |

## It gives the answer away, so it follows the answer key

The explanation usually states the answer, so it is served exactly where the answer key is and
nowhere else:

| Where | When the explanation is sent |
|---|---|
| `CurrentQuestionDto` (the question being played) | **never** |
| `InstantFeedbackAnswerResultDto` (submit response) | on every answer — right, wrong or timed out — **only** if the quiz has instant feedback |
| `UserAnswerDto` in the session DTOs | only once the session reveals: completed, or instant feedback. See [quiz-grading.md](quiz-grading.md), "What the session response reveals, and when" |
| Question DTOs (`QuestionBaseDTO`, the author's view) | always — the same exposure the answer key already has there |

Unlike the correct-answer fields of the instant-feedback result, which are sent only on a wrong
answer, the explanation is sent on a right one too: a lucky guess is exactly when the "why" is worth
reading.

## Where authors write it

- **Quiz builder** — every new-question card (`new-display-quiz-question-card/*`) has an
  `ExplanationField` below the answers, through `BaseQuestionFormCard`. Collapsed to a quiet
  "Add an explanation" button while empty; open from the start when there is one, which is the
  AI path — the author should see what the model wrote in order to review it.
- **Standalone question forms** — create and update drawers for all three types, registered with
  react-hook-form.
- **Data transfer** — an optional `Explanation` column in the questions import/export
  ([import templates](../data/import-templates/README.md)).

The editor and the player-facing note are both in `src/common/QuestionExplanation.tsx`.

## AI generation

`AiPromptBuilder` asks for an `explanation` on every question, in both modes: one or two sentences,
at most `ExplanationTargetLength` (250) characters, in the question's language; in Source mode, from
the material only. Asking the model to justify its key is also a cheap accuracy aid — an answer it
can't explain is one it is more likely to have wrong — which is why it is in the prompt for both
paths rather than left to the author. See [ai-question-accuracy-plan.md](ai-question-accuracy-plan.md).

A reply without explanations (an older prompt pasted into the own-AI page) is still fine: the field
is optional in the parser.

## What the player sees

- **Instant feedback:** under the Correct / Incorrect panel (`FeedbackDisplay`). The auto-advance
  countdown **stretches to fit it** — three seconds is enough to see a verdict, not to read two
  sentences. The wait is scaled to the explanation's length (`explanationReadingSeconds`, about 200
  words a minute plus a beat), never shorter than the default 3 s, and **never longer than
  `ReadingAllowanceSeconds`**, which the server sends with the result. The player can always click
  Next sooner.

  The cap is not a UX choice, it is what keeps the session alive: the session's total-time deadline
  keeps running between questions, and sets aside exactly `ExplanationReadSeconds` (10 s) for each
  explained question in an instant-feedback quiz. A first version paused auto-advance until Next,
  and a player who read every explanation could be abandoned mid-quiz. See
  [session-lifecycle.md](session-lifecycle.md), "The timing rules", and
  [ADR 0016](../adr/0016-the-feedback-screen-cannot-outwait-the-session-deadline.md).
- **Results review:** under each answer in `question-review.tsx`.

## Not covered yet

- **Multiplayer rounds.** A round's `QuestionResult` doesn't reveal the correct answer at all yet, so
  it has nowhere to put an explanation. Players see explanations in the results review after the
  match, like everything else about the answers.
- **The question-preview tester** (`TestQuestionService`) returns only right/wrong and the key.
