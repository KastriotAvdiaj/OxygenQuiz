# 5. The import report is not a notice you can turn off

Date: 2026-09-01
Status: Accepted

## Context

After an AI import, one banner sat above the prefilled builder carrying three different things:

1. **Status** — "Drafted 7 questions — review and edit before saving."
2. **A provenance nudge**, topic mode only — "These came from the AI's own knowledge rather than
   a source you gave it — check the answers before you publish."
3. **An exception report** — every question the parser dropped, listed individually with its
   reason, plus any difficulty that fell back to the quiz's own.

The first two are the same on every import. By the tenth quiz they are furniture, and the request
that followed was the obvious one: make it a popup with "Do not show again".

The third is not like the other two. It is the only place a user learns that four of their ten
questions did not survive validation. `import-summary.tsx` said so in its own doc comment —
*"silently importing 8 of 10 questions is the failure mode this exists to prevent"* — and two rows
of the failure-mode catalogue in `ai-quiz-architecture.md` §6 name this UI as the mechanism that
makes those failures non-silent.

So the danger was not the preference. It was that the preference would have been attached to a
component that also carries a report, and nobody would have noticed until a generation quietly
imported six of ten for someone who clicked "don't show again" a month earlier.

## Decision

**Split by what the message is about, not by where it appears.**

`ImportNotices` carries the exception report. It renders only when something was actually dropped
or substituted, and it has **no dismiss, no "don't show again", and no persistence**. A user
cannot opt out of being told what happened to their own data. Because it renders nothing in the
common case, being undismissable costs nothing on the imports where there is nothing to say.

`ImportSummary` keeps the status line and the provenance nudge, and gains both dismissals —
"Dismiss" for this import, "Don't show again" stored in `localStorage` under a versioned key. That
is advice about how to use a feature, and advice is the kind of thing a person is allowed to say
they have already read.

**It stays inline. It is not a modal.** That was the other half of the request, and it is ruled out
by [`0001-ai-generation-options-stay-visible.md`](0001-ai-generation-options-stay-visible.md),
which closes: *"Any 'guided' first-run experience must keep the surrounding fields legible rather
than hiding or blurring them, or it must be rejected."* A dialog over the review step would be the
fourth attempt at the shell that was reverted three times on these screens.

The evidence in that ADR applies directly rather than by analogy. NN/g's finding that instructional
overlays fade from short-term memory in about twenty seconds is why coach marks were rejected
there, and it is fatal here too: a modal fires *before* the questions are on screen, so by the time
someone is reading answer three the warning is gone. The banner works because it sits above the
questions while they are being read. Moving it into a popup makes it more interruptive and less
effective at once.

Alternatives considered and rejected:

- **One banner, one "don't show again", exceptions included.** What was asked for, and the reason
  this ADR exists. It makes a data-loss report opt-out-able through a control that appears to be
  about something else.
- **Per-user preference via `/api/settings`.** Better semantics — an acknowledgement belongs to the
  person, not the browser, and would survive a second laptop or a shared admin machine. Rejected
  as disproportionate for a nudge: a settings field, a migration and a DTO change to remember one
  boolean. Revisit if a second such preference appears; two is a pattern.
- **No persistence, just a smaller banner.** Solves the space complaint without a suppression
  mechanism to reason about. Rejected because the nudge genuinely stops being informative to a
  daily user, and shrinking it makes it less readable to a first-time one — the opposite trade.

## Consequences

- **`Start over` had to survive the dismissal.** It lived inside the banner and had no other home,
  so hiding the banner forever would have removed the only way to discard a draft — a preference
  about a *notice* silently removing an *action*. A slim row keeps it, alongside a Sparkles button
  that reopens the notice for the current import, so "don't show again" is walkable-back without
  going near browser settings. **Check this whenever a dismissible surface gains a control:** the
  same trap is one refactor away.
- **The storage key is versioned** (`oxygenquiz:ai-import-notice:v1`). A dismissal means "I have
  read *this* wording", so a materially reworded warning should bump the version and get one more
  showing rather than arriving pre-dismissed for everyone. Bump on meaning, not on typos.
- **Storage failures fail open.** Reads and writes are wrapped, and an unreadable preference
  resolves to *showing* the notice. "I could not find out whether you dismissed this" must never
  silently resolve to "hidden", and must never be why a page crashes.
- **The preference does not follow the user.** Per device, per browser; reset by clearing site
  data; on a shared admin machine one person's dismissal hides it from the next. Accepted for a
  nudge — and the reason the exception report is not stored this way at all.
- **Storybook needed decorators.** Both view stories clear the key so a review-handoff story
  cannot render a different state than its name claims, and a `ReviewHandoffWithNoticeDismissed`
  story covers the collapsed row.
- **The rule generalises, and should be applied on sight:** a preference may silence *advice*; it
  may never silence a *report about what happened to the user's data*. When a surface carries
  both, that is the seam to split on — before someone asks for the dismiss button, not after.
