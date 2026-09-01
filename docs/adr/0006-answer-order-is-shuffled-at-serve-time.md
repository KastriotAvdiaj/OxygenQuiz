# 6. Answer options are shuffled when served, not when stored

Date: 2026-09-01
Status: Accepted

## Context

On the development database, **67.9% of multiple-choice questions had the correct answer as the
first option** (53 of 78; uniform would be nearer 30% for the stored mix of 2-to-4-option
questions). A player could score well above chance by pressing the top button every time.

Nothing was broken, which is what took a while to see. Every layer was working exactly as written:

| Step | What it did with order |
|---|---|
| `AiPromptBuilder` | Asked for `answerOptions` with `isCorrect` flags — **never asked the model to vary which position is correct** |
| `parse-ai-output.ts` | Mapped the array as received; no sort |
| `QuizService` import | `.Select(…)` — order preserved, identity ids assigned in that order |
| `QuizRepository`, `MatchOrchestrator`, `QuizSessionService` | Projected `AnswerOptions` with **no `OrderBy` and no shuffle** |

So the bias was not introduced anywhere. It was *authored* — language models write the correct
answer first, and so, often, do people — and then transmitted faithfully by a pipeline that had no
opinion about order at all. A grep for `shuffle` or `random` across the backend returned only the
CSPRNG calls in `TokenService` and `InviteCodeGenerator`.

A second finding fell out of the same search: `Quiz.ShuffleQuestions` had been a column, a
migration, a DTO field, a mapped property and a **visible checkbox in the create-quiz form** since
the initial migration, and no code had ever read it. Ticking it did nothing.

## Decision

**Shuffle answer options where they are served, seeded deterministically.**

Serve-time rather than import-time, because import-time only fixes questions created afterwards.
Every quiz already in the database would have stayed spammable, and the population that matters is
the one people are already playing. Shuffling on the way out fixes the entire back catalogue with
no data migration and no risk to stored rows.

The seed makes the order a pure function of *who is playing which question*, so it can be
recomputed instead of stored:

- **Single-player**: `sessionId + quizQuestionId`. `ToCurrentQuestionDto` is called on every state
  poll, every resume and every reconnect, so the order has to come out identical each time or the
  options slide around under the player mid-question. Replaying the quiz starts a new session and
  therefore a new order.
- **Multiplayer**: one fresh seed per match. The round list is materialised once into memory and
  every player is served from it, so they all see the same board — they are talking to each other,
  and "it's the third one" has to mean the same thing to everyone. The next match reshuffles.

`Quiz.ShuffleQuestions` is honoured at the same two seams, seeded the same way.

**True/False is deliberately excluded.** It is a two-item scale, not a list of candidates: there is
no positional advantage to remove, since a coin-flip guess is right half the time either way, and
"False" appearing first is merely disorienting.

Two implementations were specifically rejected, and both are the obvious simplification:

- **`new Random(seed)`.** Deterministic within a runtime, but the algorithm behind seeded `Random`
  is not a documented cross-version contract.
- **`string.GetHashCode()` as the seed.** Randomised per process in .NET Core. It would pass every
  test, then reorder every in-flight question the moment the API restarted — a bug that appears
  only in production, only during a deploy, only to whoever was mid-quiz.

`DeterministicShuffle` instead orders by an FNV-1a hash of (seed, option id): fixed by
specification, stable across processes and versions, and independent of the input order, so it
cannot accidentally preserve an already-biased arrangement.

## Consequences

- **Grading was already safe.** Answers are submitted as `SelectedOptionId` / `SelectedOptionIds`
  and compared against `correctIds`; nothing indexes into the options array. Had the client
  submitted positions, this change would have silently mis-graded every answer — worth checking
  first in any codebase where you are about to reorder something.
- **A pinned test guards the algorithm.** `The_permutation_is_pinned_to_a_stable_hash` asserts a
  hardcoded expected order. It is a test of an implementation detail on purpose: the two rejected
  implementations above would pass every behavioural test in the file while breaking the guarantee
  that matters, and neither failure is reproducible without a restart or a runtime upgrade. If it
  ever fails, do not update the constant while sessions may be in flight — changing it reshuffles
  every live quiz.
- **Existing quizzes change appearance immediately** on deploy. No migration, but also no warning:
  a player mid-session when the API restarts will see their current question's options reordered
  once. Acceptable, and worth knowing before someone reports it as a bug.
- **The AI prompt was left alone.** Asking the model to vary the correct position would be a
  weaker fix in every respect — models are poor at it, it does nothing for the 78 questions already
  stored, and it does nothing for hand-authored ones. Serve-time shuffling makes authoring order
  irrelevant, which is the stronger property.
- **`ShuffleQuestions` now does what its checkbox says**, for the first time since it was added.
  Quizzes with it already ticked will change behaviour on deploy — nobody could have been relying
  on that, since it never worked, but it is a live behaviour change all the same.
- **The general lesson:** a faithful pipeline is not a neutral one. Every stage here preserved
  order correctly and the result was still unfair, because *no stage owned the question of what
  order should be*. When no component owns a property, it is inherited from whatever produced the
  data — here, a model's habit of writing the answer first.
