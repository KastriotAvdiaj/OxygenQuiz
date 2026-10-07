# 19. Unfinished builders restore silently and guard the exit

Date: 2026-10-06
Status: Accepted — partly supersedes [ADR 0009](0009-a-restored-draft-is-announced-not-asked-about.md)

## Context

ADR 0009 put `RestoredDraftNotice` ("Picked up where you left off … Start fresh") above every
builder that restores a draft, and rejected restoring silently on the grounds that a returning
author would find an unexplained, half-filled builder.

In use, the notice read as clutter: an author who comes back to a half-built quiz recognises it
as their own unfinished one. Meanwhile the opposite gap was real — nothing stopped an accidental
Back, a nav click or a reload mid-build. The draft survived it, but the author got no signal
that they were leaving an unfinished quiz.

## Decision

For the **manual (Classic) builder** and the **Associations board builder**:

- **Restore silently.** The draft is still hydrated before the first paint
  (docs/quiz/quiz-draft-persistence.md); there is no notice and no **Start fresh**. The quiet
  "Draft saved" marker stays.
- **Guard the exit.** While the builder holds work worth keeping (the same
  `is…DraftWorthKeeping` test that decides whether a draft is stored), `useNavigationGuard` is
  armed: in-app navigation opens `LeaveUnfinishedQuizDialog`, and a reload or tab close gets the
  browser's own prompt. The redirect after a successful create goes through via
  `allowNavigation()`.

The AI wizard is unchanged: it keeps its notice (its draft is a paid generation), and its guard
stays armed only while a generation is in flight.

## Consequences

- **No one-click reset.** To start a different quiz with a draft in the slot, the author clears
  the fields (or deletes the questions); once nothing is worth keeping, the slot clears itself.
  `QuizQuestionProvider.clearQuiz`, which existed only for **Start fresh**, was removed.
- **The "prompt people learn to click through" risk** that ADR 0009 and `ai-quiz-wizard.tsx`
  warn about is accepted here, bounded by the worth-keeping test: an untouched builder never
  prompts.
- Edit mode keeps no draft and is not guarded.
