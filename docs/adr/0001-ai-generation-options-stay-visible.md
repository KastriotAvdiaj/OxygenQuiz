# 1. Every AI generation option stays visible

Date: 2026-08-23
Status: Accepted

## Context

The AI quiz creation screen (`AI-Quiz/`, both the generate-for-me and the own-AI path)
asks for one required thing — the topic — and offers eight optional fields around it:
quiz title, description, category, language, difficulty, question count, question types,
extra instructions.

Those eight have been hidden behind a disclosure three times, in three different shells:
an accordion, a centred dialog, and a right-hand drawer. Each was reverted. The reasons
are recorded in `advanced-options.tsx`, `docs/quiz/ai-quiz-two-paths.md` §2 and
`docs/RESPONSIVE.md` (Aug 22 2026 pass), and they were largely about the cost of the
shell — an overlay that covered the page it belonged to, a trigger that needed a "3 set"
badge to describe its own contents.

A fourth attempt was proposed in Aug 2026: a step-by-step modal asking one field at a
time. Grilling it surfaced the argument that actually settles the question, which is not
about shells at all.

**Every one of these fields has a working default, and a hidden default is an
undiscoverable default.** Question count is 5. Question types is Multiple Choice. Category,
language and title are "whatever the model suggests". A user who never opens the drawer
does not get *no* answer to those questions — they get *our* answer, and no way to know
it was asked. The accordion did not spare them a decision; it made a decision on their
behalf and hid the evidence. "Why did it make 5 questions?" has no answer inside a
collapsed panel.

A step flow has the same defect in a different direction: it shows each field once, in
sequence, and then takes it away. At the moment the user presses Generate, the settings
that produced the quiz are off-screen.

## Decision

All eight optional fields render on the same screen as the topic box, with their real
current values shown, at every viewport width.

- Optionality is communicated by **labelling** — one "Optional / Leave anything blank and
  the AI decides it" statement over the group — not by hiding.
- Density problems on short viewports are solved with spacing and type steps
  (`short:`), never by hiding a field or collapsing the group.
- Reducing *perceived* load is a typography and hierarchy problem, and is to be attacked
  there. It is not a licence to re-hide fields.

This constrains any future redesign of these screens, including onboarding treatments:
a coach-mark tour that blurs the rest of the form, or a wizard that shows one field per
step, both violate it for the duration of the flow.

## Two proposals this rules out, and the evidence

The Aug 2026 review proposed replacing the visible form with a **step-by-step modal** asking one
field at a time, and alternatively a **coach-mark tutorial** blurring the page and walking through
each field. Both were rejected, and the reasoning is worth keeping because both will be proposed
again.

**The wizard.** NN/g's definition turns on dependency — *"subsequent steps may depend on
information entered in previous ones"* — and nothing here depends on anything: the eight optional
fields are independent, and eight of the nine steps would be skippable. A step you can skip is a
step that should not exist. They also advise against wizards for tasks users repeat, which quiz
creation is. The multi-step conversion figures usually cited for this pattern come from marketing
blogs with no sample sizes, and even those sources caveat that multi-step wins for forms that are
*"sufficiently complex or long"* — this one has a single required field. GOV.UK's one-thing-per-page
exists for low-confidence users, branching, error handling and saved progress; there is no
branching here, one validation rule, and nothing to save.

**The tutorial.** This one has a controlled study pointing the wrong way, on the exact metric we
were trying to move. NN/g ran tutorial vs no-tutorial across 70 users and 4 apps: task success was
91% with and 94% without — noise — but the users who *saw* the tutorial rated the tasks
**harder** (4.92 vs 5.49 on a 7-point ease scale). Their conclusion: *"tutorials can make apps
seem overly complicated"*, and the effort *"would be better spent on making the UI easy to use."*
The stated problem was that the screen *feels* like a lot; the one thing we know about upfront
tutorials is that they make things feel like more. Coach marks specifically fare no better —
short-term memory *"fades in about 20 seconds"*, so a tour naming eight fields teaches none of
them, and NN/g's narrow endorsement is for a single, genuinely non-obvious action. "Quiz title"
is not that.

Both also violate this ADR for the duration of the flow: a step modal shows one field at a time,
and a coach tour blurs the rest.

Sources: [NN/g, Mobile Tutorials](https://www.nngroup.com/articles/mobile-tutorials/) ·
[NN/g, Instructional Overlays and Coach Marks](https://www.nngroup.com/articles/mobile-instructional-overlay/) ·
[NN/g, Wizards](https://www.nngroup.com/articles/wizards/) ·
[GOV.UK, One thing per page](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/)

## Consequences

- The form is tall. On a short laptop viewport it may not fit in one screen, and that is
  accepted: scrolling a visible form beats not knowing the form exists.
- The screen cannot be made shorter by deferring fields. The only levers left are type
  scale, spacing, and grouping — which is the intended constraint.
- Any "guided" first-run experience must keep the surrounding fields legible rather than
  hiding or blurring them, or it must be rejected.
- A field added to the AI request is a field added to this screen. If that becomes
  untenable, the right move is to question whether the option should exist, not to hide it.
