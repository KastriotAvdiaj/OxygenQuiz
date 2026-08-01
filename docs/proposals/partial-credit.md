# Proposal: partial credit for multi-select questions

**Status: open.** Nothing implemented, nothing decided. Written 2026-07-31.

On a multiple-choice question with `AllowMultipleSelections` where 3 options are correct, a player
picks 2 of them. Do they score?

---

## 1. What happens today

`AnswerGradingService.DetermineCorrectnessAsync`:

```csharp
if (mcq.AllowMultipleSelections)
{
    // All-or-nothing: the chosen set must match the correct set exactly —
    // every correct option selected and no incorrect ones.
    var selectedIds = ParseSelectedOptionIds(answer);
    return selectedIds.Count > 0 && selectedIds.SetEquals(correctIds);
}
```

2 of 3 scores **zero** — identical to picking nothing, or to picking three wrong ones.

Correctness is a `bool` the whole way down: `DetermineCorrectnessAsync` returns `bool`,
`GradeAnswerAsync` returns `(bool IsCorrect, int Score)`, `QuizScoring.PointsForCorrectAnswer`
computes the value of *a* correct answer, and `UserAnswer.IsCorrect` / `PlayerRoundResult.IsCorrect`
are booleans all the way to the UI. **This is the central constraint.** Partial credit is not a
scoring tweak; it's a change to the type of an answer.

## 2. The case for and against

**For.** All-or-nothing makes multi-select strictly harder than it looks. A player who knows 2 of 3
demonstrably knows more than one who knows 0, and the score says they're identical. It also creates
a perverse incentive: if you're unsure of the third, there's no cost to guessing wildly, because
partial knowledge is worth nothing either way.

**Against.** All-or-nothing is *unambiguous*, and players understand it instantly. Every partial
scheme raises questions with no obviously right answer (§5), and each one rewards some form of
guessing — on a 4-option question with 3 correct, "select all 4" gets 3 of 3 under a naive scheme.

The strongest argument against isn't difficulty, it's that this game is **timed and competitive**.
Fractional scores interact with the speed bonus and with multiplayer standings in ways that are hard
to explain on a results screen. "You got 640 points" is worse UX than "correct / incorrect" unless
the display is redesigned for it.

## 3. Schemes

Let `C` = correct options, `S` = selected, `k = |C|`.

### 3.1 Proportional

`score = base × |S ∩ C| / k`, zero if any wrong option is selected.

- 2 of 3 → 67%.
- Simple and explainable.
- Selecting everything scores 0 (a wrong option is present), closing the obvious exploit.
- **Problem:** 1 of 3 scores 33% for what may be a coin flip.

### 3.2 Proportional with penalty

`score = base × (|S ∩ C| − |S \ C|) / k`, floored at 0.

- Rewards knowledge, punishes shotgunning, no need for the "any wrong = 0" rule.
- Standard in academic testing.
- **Problem:** harder to explain, and negative-then-floored means two different answers both show 0.

### 3.3 Threshold

Full marks at ≥ some fraction (say all-but-one), zero below.

- Keeps the boolean — `IsCorrect` stays a `bool`, nothing downstream changes.
- **By far the cheapest**: a one-line change in `DetermineCorrectnessAsync`.
- **Problem:** it's a difficulty knob wearing partial credit's clothes. 2 of 3 is worth either full
  points or nothing, which is arguably *less* fair than today.

### 3.4 All-or-nothing (status quo)

Keep it, and optionally make the UI say so plainly ("select all that apply — all of them").

## 4. What each costs

| Scheme | Model | Grading | Scoring | UI | Multiplayer |
|---|---|---|---|---|---|
| Threshold (3.3) | — | 1 line | — | — | — |
| Proportional (3.1) | per-question flag + migration | returns a fraction | `PointsForCorrectAnswer` takes a multiplier | results screen needs a partial state | round result + standings show fractional gains |
| Proportional w/ penalty (3.2) | as 3.1 | as 3.1 | as 3.1 | as 3.1, plus explaining the penalty | as 3.1 |

For 3.1/3.2 the real work is the type change — `bool IsCorrect` becoming something like
`(bool IsCorrect, double Credit)` threaded through `AnswerGradingService`, `QuizScoring`,
`UserAnswer`, `PlayerRoundResult`, the session result DTOs and both results UIs. The arithmetic is
trivial; the plumbing is the cost.

Also **historical comparability**: `UserAnswer.IsCorrect` feeds the stats/history features
([`user-stats-history.md`](../quiz/user-stats-history.md)). If a question can be 60% correct,
"questions answered correctly" needs a definition and old rows must keep meaning what they meant.
The `RescaleScoresToHighResolutionBase` migration is the precedent for how much care that takes.

## 5. Open questions to settle first

1. **Per-question or global?** Per-question matches how `AllowMultipleSelections`, `IsCaseSensitive`
   and `AllowPartialMatch` already work and avoids re-grading existing quizzes. Almost certainly
   right, but it adds a migration and a builder switch.
2. **Does partial credit earn the speed bonus?** `QuizScoring` multiplies base points by a time
   factor. Applying credit before or after gives different answers, and "fast but half right beats
   slow and fully right" is a real possibility that needs to be a decision, not an accident.
3. **What does the results screen show?** Today a question is a green tick or a red cross. This
   needs a third state, in singleplayer results *and* the multiplayer round reveal.
4. **What counts as "correct" for stats?** Any credit? Full only? A threshold?
5. **Does the player know before answering?** If partial credit is on, the question UI should say
   so — optimal strategy differs, and hiding that is unfair.

## 6. Recommendation

**Do nothing yet; revisit with data.** Multi-select is a small share of the catalog and there's no
evidence about how often players land on a near-miss. Instrumenting that — how many multi-select
answers are "all but one correct" — is cheap, and turns this from a taste argument into a measured
one.

If it *is* built: **3.1 proportional, any-wrong-option-zeroes, per-question, off by default.**
Explainable to players, no guessing exploit, no existing quiz changes behaviour.

**3.3 threshold is a trap.** It looks like the cheap version of this feature but doesn't deliver
partial credit at all, and having shipped it would make the real change harder to justify later.

---

## Related

- [`quiz/quiz-grading.md`](../quiz/quiz-grading.md) — the grading and scoring pipeline this changes.
- [`typed-answer-typo-tolerance.md`](./typed-answer-typo-tolerance.md) — the parallel "how right is
  right enough" question for typed answers.
- [`quiz/user-stats-history.md`](../quiz/user-stats-history.md) — the comparability constraint.
