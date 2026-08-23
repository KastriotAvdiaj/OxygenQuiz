# Proposal format

Files live at `docs/proposals/<slug>.md`. No numbering — the slug is the identity.
`partial-credit.md` is the reference example.

## Template

```md
# Proposal: <what is being proposed, lowercase>

**Status: open.** Nothing implemented, nothing decided. Written <YYYY-MM-DD>.

<A lead paragraph posing the question as a concrete scenario, not an abstraction. "On a
multiple-choice question with `AllowMultipleSelections` where 3 options are correct, a player
picks 2 of them. Do they score?" — not "multi-select grading could be improved.">

---

## 1. What happens today

<The current behaviour, quoting the real code that implements it. Name the file and method.>

<Then the constraint that makes this hard, stated plainly and in bold if it is *the* one.
This is the most valuable section — it is what stops the proposal being re-litigated by
someone who thinks it's a small change.>

## 2. Options

<Each option with what it costs. Be specific about blast radius: which types change, which
tables, which UI.>

## 3. Recommendation

<One option, and why. A recommendation you would defend, not a summary of the options.>
```

## Rules

- **Numbered sections.** `## 1. What happens today`, `## 2. Options`. Existing proposals use
  numbers; keep them.
- **Quote real code.** A proposal that describes current behaviour in prose without showing it
  invites an argument about what the code does. Show it.
- **State the blast radius.** `partial-credit.md` is convincing because it establishes that
  `IsCorrect` is a `bool` through grading, scoring, persistence and UI — so the change is to
  the type of an answer, not to a scoring rule.
- **Wrap at ~100 columns**, like the rest of `docs/`.
- **Status line is one line**, bold, with a date.

## Status transitions

**Open** — the default. Nothing scheduled.

**Rejected** — replace the status line with `**Status: rejected (<date>).**` and the reason
directly under it. Keep the file. Move its row out of the **Open** table in
`docs/proposals/README.md`.

**Accepted** — the file is deleted, but only after its reasoning has been written into the
relevant feature doc. See the SKILL.md section "Accepting one — do not skip the fold-in" for
the required order. Never delete first.

## The two index entries

Every open proposal appears in exactly two other places. Both are updated whenever a proposal
is created, accepted or rejected:

1. The **Open** table in `docs/proposals/README.md` — proposal link, the question in one line,
   and what it is blocked on.
2. A one-line entry in `docs/deployment/known-issues.md`, the catch-all index.

A proposal that exists in only one of them is half-filed and will be missed.
