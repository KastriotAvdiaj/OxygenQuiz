---
name: oxygen-docs
description: Build and sharpen OxygenQuiz's domain vocabulary and record decisions in docs/. Use when discussing codebase terminology, when two words are being used for one concept, when writing or editing a docs/<area>/glossary.md, or when recording, accepting or rejecting a proposal in docs/proposals/.
---

# OxygenQuiz docs

Actively sharpen the project's vocabulary and record its decisions **as they happen**, in the
formats `docs/` already uses. This is the *active* discipline: challenging terms, inventing
edge-case scenarios, and writing things down the moment they crystallise. Merely *reading* a
doc for context is not this skill — any task can do that. This is for when you are *changing*
the model.

Adapted from the generic `domain-modeling` skill. Two deliberate differences, both because
this repo already solved these problems:

- **No `docs/adr/`.** Decisions go through `docs/proposals/`, which is this repo's ADR system
  and has its own lifecycle. Creating a second decision folder is a bug, not a feature.
- **No root `CONTEXT.md`.** Vocabulary lives per area, in `docs/<area>/glossary.md`.

## Where things go

`docs/` is organised by area. Put a doc in the area it belongs to, never at the root:

| Area | Holds |
|---|---|
| `docs/quiz/` | Quiz authoring, playing, grading, scoring, timers, discovery, reports |
| `docs/auth/` | Identity, login, roles, permissions, guest play, invite codes |
| `docs/data/` | Databases, import/export, templates |
| `docs/media/` | File storage, image upload |
| `docs/deployment/` | Infrastructure, runbooks, configuration, `known-issues.md` |
| `docs/development/` | Tooling, testing, storybook, error handling, rate limiting |
| `docs/proposals/` | Decisions **not yet made** — see below |

If a topic genuinely fits no area, ask before inventing a new folder.

## House format

Match what's already there. Read a neighbouring doc in the same area before writing; the
conventions below are the ones every existing doc follows.

- **`# Title`**, optionally with an em-dash subtitle that states the rule:
  `# Guest play — one free singleplayer quiz, no account required`.
- **A lead paragraph immediately after the H1.** No `## Overview` heading — say what the doc
  covers in prose and move on.
- **A status blockquote when the doc records something shipped or superseded:**
  `> **Status: implemented (2026-06-22).**` followed by what it supersedes, with a link.
- **Section headings are claims, not labels.** `## Why guest sessions don't reuse the real
  session pipeline's persistence`, not `## Design notes`.
- **Link source files by relative path**, e.g.
  `[QuizSessionService.cs](../OxygenBackend/QuizAPI/Controllers/.../QuizSessionService.cs)`.
  Verify the path resolves before writing it.
- **Tables for enumerations** — question types, status values, config keys.
- **Bold lead-ins on bullets.** `- **The limit is soft, by design:** ...`
- **Wrap prose at ~100 columns.** Tables and code blocks may exceed it.
- **Explain the *why*, not just the *what*.** Every good doc in this repo has a section
  defending a choice against the obvious alternative. Write that section.

## During a session

### Challenge against the glossary

When a term conflicts with the area's `glossary.md`, stop and say so. "The quiz glossary
defines `Question` as a bank item and `QuizQuestion` as its placement in a quiz — which do you
mean?" Do not guess and carry on.

### Sharpen fuzzy language

When one word is doing two jobs, propose a canonical term for each. This repo has real
collisions worth catching: `Question` vs `QuizQuestion`; the persisted `QuizSession` vs
in-memory multiplayer lobby state; `UserAnswer` vs `SubmittedAnswer` vs `AnswerOption` vs the
acceptable-answer rules.

### Cross-reference with code

When the user states how something works, check whether the code agrees — the backend models
in `OxygenBackend/QuizAPI/Models/` are the source of truth for entity names. If code and claim
disagree, surface it rather than documenting the claim.

Prefer `graphify query "<question>"` over grep for locating things; see `CLAUDE.md`.

### Discuss concrete scenarios

Stress-test relationships with specific cases. "A player answers 2 of 3 correct options" is
worth more than "multi-select grading is nuanced" — and it is how `partial-credit.md` found
that `IsCorrect` is a `bool` through the entire chain.

## Glossary

One `glossary.md` per area, created **lazily** — only when the first term is actually
resolved. Never sit down and write a vocabulary sweep; entries are earned in conversation.
Update it inline the moment a term settles, not in a batch at the end.

Format: [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

A glossary is a dictionary and nothing else. No implementation detail, no behaviour, no
rationale — those belong in the area's feature docs.

## Proposals

`docs/proposals/` holds decisions that have been thought through but **not decided and not
implemented**. Read `docs/proposals/README.md` before touching anything here.

Format: [PROPOSAL-FORMAT.md](./PROPOSAL-FORMAT.md).

### Offer one sparingly

Only when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is real.
2. **Surprising without context** — a future reader will wonder why it was done this way.
3. **A genuine trade-off** — there were real alternatives and one was picked for reasons.

Miss any one and skip it. Easy-to-reverse decisions just get reversed.

### Writing a new proposal

1. Write `docs/proposals/<slug>.md` in the format.
2. Add a row to the **Open** table in `docs/proposals/README.md` — proposal, the question in
   one line, and what it's blocked on.
3. Add the one-line entry to `docs/deployment/known-issues.md`, so it is not discoverable only
   from the proposals folder.

All three, or it is half-filed.

### Accepting one — do not skip the fold-in

The lifecycle in `docs/proposals/README.md` deletes an accepted proposal. That is intentional:
`docs/` describes the system as it is, and a surviving proposal competes with it. But deleting
before folding the reasoning in **loses the why permanently**, so the order is not negotiable:

1. **First**, write the reasoning into the relevant `docs/<area>/<feature>.md` as current
   behaviour — including the alternatives that were rejected and why. Add a status blockquote
   with the date. `auth/guest-play.md` is the model to copy.
2. **Then** remove the row from the proposals README table and the `known-issues.md` entry.
3. **Only then** delete `docs/proposals/<slug>.md`.

If step 1 has not happened, do not do steps 2 and 3. Say the fold-in is outstanding instead.

### Rejecting one

Keep the file. Mark it rejected at the top with the date and the reason, and move its README
row out of the **Open** table. A recorded "no" is what stops the idea being re-proposed.
