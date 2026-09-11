# 9. A restored draft is announced, not asked about

Date: 2026-09-10
Status: Accepted

## Context

Refreshing the quiz builder — either the manual one or the AI wizard — used to lose everything.
Both hold their state in `useState` and react-hook-form and neither wrote it anywhere, so a
stray Cmd-R, a closed tab or a crashed browser cost the user whatever they had typed, and on
the AI path it cost them a generation they had paid quota for.

Keeping the work locally is the fix, and the mechanics of that are not controversial. What
*is* a decision is what happens on the way back in. Two shapes were on the table:

1. **Ask.** Open the builder empty and put a dialog over it: *"You have an unfinished quiz —
   Restore / Start fresh."* Nothing is hydrated until the user chooses.
2. **Announce.** Hydrate the draft before the first render, and put an inline notice above the
   builder saying so, with **Start fresh** beside it.

Asking is the more cautious-looking option and it was the first instinct. It is also the one
this codebase has already argued against twice, in two different places, for two reasons that
both apply here.

The first is in `ai-quiz-wizard.tsx`, explaining why the navigation guard is armed only while
a generation is actually in flight:

> *"The typed topic and the details are not guarded: they are cheap to retype, and confirming
> every exit from a form nobody has spent anything on is the kind of prompt people learn to
> click through — which would blunt this one."*

A restore dialog is exactly that prompt, on the way in rather than the way out. It would fire
on every return to the builder, including the overwhelmingly common case where the user left
two minutes ago and obviously wants their work back. Teaching someone to dismiss a dialog
without reading it is not free: the *next* dialog on these screens is the one that stands
between them and a lost generation.

The second is [ADR 0001](0001-ai-generation-options-stay-visible.md), which rejected coach
marks and overlays on these screens and closes: *"Any 'guided' first-run experience must keep
the surrounding fields legible rather than hiding or blurring them, or it must be rejected."*
A modal asking about a draft hides the very thing the user needs in order to answer — they
cannot see what the draft contains while being asked whether they want it.

## Decision

**Hydrate first, then say so.**

A stored draft is read synchronously — `localStorage` makes this possible — in the `useState`
initialiser that seeds the form, so the builder's first paint already contains the user's
work. Above it sits `RestoredDraftNotice`: one line saying the work was picked up, when it was
saved, and what is in it, with **Start fresh** as an inline button that discards the draft and
empties the form.

Three constraints make announcing safe, and the decision does not stand without them:

- **Nothing is stored unless the user typed something.** `isManualQuizDraftWorthKeeping` and
  `isAiQuizDraftWorthKeeping` return `false` for a form holding only its defaults, so a
  builder nobody has touched stores nothing and the notice never appears for work nobody did.
  Being greeted by a notice about an empty quiz is precisely how a notice becomes furniture.
- **The undo is one click and always visible** while the notice is. There is no state a user
  can be hydrated into that they cannot get out of without clearing site data.
- **Drafts expire.** Past seven days a draft is dropped on read, so nobody is handed work they
  abandoned a month ago and have forgotten writing.

Alternatives considered and rejected:

- **Ask in a dialog.** Above. It trains people to click through prompts on the screens where
  one prompt genuinely matters, and hides the information needed to answer it.
- **Restore silently, with no notice.** Cheapest, and wrong. A user returning to build a
  *different* quiz would find the old one loaded with no explanation and no way back, and
  would reasonably conclude the builder was broken. Restoring is a thing that happened to
  their data; they get told.
- **A toast instead of an inline notice.** Toasts leave. The notice has to persist for as long
  as it is true, because the thing it explains — a builder that isn't empty — persists.

## Consequences

- **The provider needed a way to be emptied.** "Start fresh" has to clear both halves of the
  builder, and the usual reset-by-`key` remount is unavailable here: `QuizQuestionProvider`
  sits *above* the form, so remounting it would take the react-hook-form fields with it and
  the two resets would have to be kept in step forever. Hence `clearQuiz()` on the context —
  one caller today, and its doc comment says why it exists so it does not get treated as a
  general-purpose escape hatch.
- **Restore is on the way in, so it is the route's job.** `create-quiz-route.tsx` reads the
  draft and seeds `initialValues` and `initialQuestions` — two props that already existed, for
  edit mode and for the AI handoff. A draft is a third caller of the same seams rather than a
  new hydration path, and the provider needs no `hydrate()` of its own.
- **The notice is prop-driven in the AI views**, like everything else in them, so both wizard
  stories can show it without a hook. See `docs/development/storybook.md` ("Slot props").
- **The rule generalises:** hydrating a user's own work back into a form is not a decision that
  needs their permission, it is an event that needs their awareness. Ask before doing something
  the user cannot undo; announce what they can undo in one click. If a future draft ever
  becomes expensive to discard — one that has already spent something, say — that is the point
  to revisit this, not before.
