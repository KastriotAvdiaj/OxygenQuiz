# glossary.md format

One per area: `docs/quiz/glossary.md`, `docs/auth/glossary.md`, and so on. Created lazily —
the file appears when the first term in that area is resolved, not before.

## Structure

```md
# Quiz glossary

The words this area uses, and the ones it deliberately doesn't. Behaviour lives in the feature
docs alongside this file; this is vocabulary only.

## Authoring

**Question**:
A reusable item in the question bank, independent of any quiz.
_Avoid_: item, prompt

**QuizQuestion**:
A Question placed into a specific Quiz at a position. Owns `OrderInQuiz`.
_Avoid_: quiz item, slot

## Playing

**QuizSession**:
A persisted single-player run of a quiz. One row per attempt.
_Avoid_: game, run, playthrough
```

## Rules

- **Be opinionated.** When several words exist for one concept, pick one and list the rest
  under `_Avoid_`. A glossary with no `_Avoid_` lines is not doing its job.
- **Define what it IS, not what it does.** One or two sentences. Behaviour belongs in the
  feature doc.
- **Only terms specific to this project.** General programming concepts — pagination, retries,
  interceptors, DTOs — do not belong here however often the code uses them. Ask: would a
  competent engineer joining this repo already know this word? If yes, leave it out.
- **Match the code's casing** for entity names: `QuizQuestion`, not "quiz question", when the
  term names a real type in `OxygenBackend/QuizAPI/Models/`.
- **Group under subheadings** once natural clusters appear. A flat list is fine while short.
- **Link the type when one exists**, so the definition and the code stay findable together.

## Cross-area terms

A term used by two areas is defined **once**, in the area that owns the concept, and referenced
from the other. `User` is owned by `docs/auth/glossary.md`; the quiz glossary links to it rather
than redefining it. If two areas genuinely disagree about a word, that disagreement is the
finding — raise it rather than writing two definitions.

## When a term changes

Editing a definition is a real change. Say what moved and check the feature docs in that area
still use the word correctly — a renamed concept with stale docs around it is worse than no
glossary.
