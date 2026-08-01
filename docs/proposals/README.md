# Proposals

Changes that have been thought through but **not decided and not implemented**.

Everything else under `docs/` describes how the system behaves today. Everything in here describes
something it might do instead. If you're reading a file in this folder to find out what the code
currently does, you're in the wrong folder.

## Why these are separate

Each of these is a decision, not a task — they change scoring, data or a user-visible contract in a
way that can't be quietly reverted once it ships. Writing the reasoning down while it's fresh means
the trade-offs don't have to be rediscovered later, and means a "no" is as recoverable as a "yes".

## Lifecycle

- **Open** — the default. Not scheduled.
- **Accepted** — move the reasoning into the relevant `docs/quiz/` (or other) feature doc as
  current behaviour, and delete the proposal. It has served its purpose.
- **Rejected** — keep the file, mark it rejected at the top with the reason. A recorded "no" stops
  the same idea being re-proposed from scratch.

Each proposal is also summarised as a one-line entry in
[`deployment/known-issues.md`](../deployment/known-issues.md), so nothing is discoverable only from
here.

## Open

| Proposal | Question | Blocked on |
|---|---|---|
| [`partial-credit.md`](./partial-credit.md) | On a multi-select question with 3 correct options, does picking 2 score anything? | A decision. Also a real cost: `IsCorrect` is a `bool` through the whole grading, scoring, persistence and UI chain. |
| [`typed-answer-typo-tolerance.md`](./typed-answer-typo-tolerance.md) | Should `parid` be accepted for `paris`? | A decision — it changes what counts as correct, so it can't default to on. |
| [`quiz-creation-atomicity.md`](./quiz-creation-atomicity.md) | Should manual quiz creation become one transactional request, like the AI import already is? | Effort, and a product call about whether authored questions survive a failed save. |
