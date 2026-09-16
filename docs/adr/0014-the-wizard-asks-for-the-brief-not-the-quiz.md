# 14. The wizard asks for the brief, not the quiz

Date: 2026-09-16
Status: Accepted

Supersedes part of [ADR 0001](0001-ai-generation-options-stay-visible.md) — the part that
counts eight optional fields. The rule ADR 0001 actually establishes is untouched, and is
restated below.

## Context

The AI wizard's details form offered eight optional fields around the topic box: quiz title,
description, category, language, difficulty, question count, question types, extra
instructions.

Five of those eight — title, description, category, language, difficulty — are fields the quiz
builder shows, filled in, on the **very next screen**. The wizard was asking for them twice: once
before generating, with no questions on screen to judge by, and again at review with the whole
quiz in front of the user.

The first ask is the weaker one, and not by a little. "What category is this quiz?" is a
question about a quiz that does not exist yet; the same question at review is about five
questions the user can read. Filling it in beforehand also spends the user's attention at the
exact moment the screen is trying to get one thing out of them, which is the topic.

The cost of keeping them was visible in the shape of the form: a two-column grid, six controls
on the left of the one control that matters.

## Decision

The wizard's details form asks only for what the model needs and the builder does not own:
**question count, question types, extra instructions.** Title, description, category, language
and difficulty are removed from it.

Consequences, stated rather than discovered:

- **The model now always proposes the category and language.** Nothing is preset, so every
  generation includes the full vocabulary and the model picks from it.
- **`ConfirmDetailsCard` stops being an edge case.** When a proposal doesn't resolve against the
  instance's lookups, that card asks — and it is now a normal step of the flow rather than a
  rarity. It is the better place for the question anyway: there are questions on screen by then.
- **Difficulty is no longer asked for at all.** `useAiQuizDraft` gives the quiz the
  median-weighted rating and the builder is where it gets changed. This is the one field with no
  confirm-card fallback, and the deliberate reason is that a wrong difficulty on a Draft quiz
  costs nothing — `EnsurePublishableAsync` is what stands between a bad rating and the catalogue.
- **A crash mid-form loses less**, because there is less in it — which is a side benefit, not a
  reason.

## What ADR 0001 says, and why this does not contradict it

ADR 0001 is about **hiding**: an accordion, a dialog, a drawer, a step flow, a coach-mark tour.
Its argument is that *a hidden default is an undiscoverable default* — "a user who never opens
the drawer does not get *no* answer to those questions, they get *our* answer, and no way to know
it was asked."

That test is the one to apply here, and it is the reason this is a different decision rather than
a violation of that one. A removed field's answer is **not** undiscoverable: the builder on the
next screen shows the category, difficulty and language the quiz ended up with, in labelled
selects, editable, before anything is saved. The answer is not hidden behind a disclosure — it is
shown one screen later, at the point where the user can judge it.

Everything ADR 0001 rules out stays ruled out. The three fields that remain render on the same
screen as the topic box, at every viewport, with their real values, labelled as optional rather
than concealed. Density on short viewports is still a spacing-and-type problem. And nothing here
licenses putting a field *back* behind a drawer: the choice this ADR makes is between asking on
the wizard and asking in the builder, never between asking and hiding.

## The thing to watch

If the confirm card starts appearing on most generations rather than some, the model's proposals
are not resolving — and the fix is the category vocabulary or the prompt, not a dropdown back on
the wizard. Check `docs/entities/category-palettes.md` and the resolver in `use-ai-quiz-draft.tsx`
before reaching for the form.
