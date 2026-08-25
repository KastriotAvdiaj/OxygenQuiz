# Documenting changes

The short version lives in [`CLAUDE.md`](../../CLAUDE.md), which is loaded into every
session and therefore pays for its length on every turn. This is the full version.

**A structural change is not finished until it is written down.** Code and docs land in the
same change, not in a follow-up — a follow-up means re-deriving the reasoning from scratch,
which costs far more than writing it did.

This applies to a change that alters how something *works* or *why*: a new prop or path list
that other code must respect, a rule about what may touch what, a decision with a rejected
alternative behind it, a defect found and deliberately deferred, a convention future work has
to follow. It does not apply to a renamed variable, a fixed typo, a tightened class string, or
anything a reader would understand from the diff alone.

Where it goes — pick the narrowest place that fits:

- **`docs/adr/`** — a decision, when all three are true: hard to reverse, surprising without
  context, and the result of a real trade-off. ADRs are append-only and dated. You never edit
  one because you changed your mind; you write a new one that supersedes it. The record of the
  wrong turn is the point.
- **The relevant `docs/<area>/*.md`** — how the thing behaves *today*. Edit these freely; they
  describe the present and carry no history.
- **`docs/deployment/known-issues.md`** — something real, found, and deliberately not fixed
  now. A defect nobody wrote down gets rediscovered at full price.
- **A doc comment on the code** — reasoning that only makes sense next to the lines it
  explains. This codebase already does this well; keep it up.

Two failure modes worth naming, because both have happened here:

- **Reasoning that lives only in a code comment is findable only if you already opened that
  file.** The AI options were hidden and un-hidden three times, and the reasons sat in
  `advanced-options.tsx` — so the fourth proposal to hide them met no resistance until someone
  went looking. That is what `docs/adr/` is for.
- **A rule nobody applies to the shell isn't a rule.** `docs/RESPONSIVE.md` was correct and
  ignored in `dashboard-layout.tsx` for a year, because its checklist was addressed to page
  authors. When you write a rule, say who it binds.

> **Four existing plans are an exception in progress.** They are cited by section number
> from 36 source comments, so retiring them means rehoming each cited section first. See
> [`../deployment/known-issues.md`](../deployment/known-issues.md), "Documentation debt".

Plan documents (`*-plan.md`) are transient by design: they describe intentions, and become
wrong the moment the work lands. When a plan is done, fold what is still true into the feature
doc and delete the plan — the same lifecycle `docs/proposals/README.md` already defines for
proposals. Check for references first: source comments cite these by section number.


## Where each kind of document lives

| File | Answers | Edited? |
|---|---|---|
| `README.md` §Architecture | How do I run and deploy this? | Freely |
| `docs/<area>/*.md` | How does this behave **today**? | Freely — describes the present |
| `docs/adr/*.md` | **Why** is it like this, and what did we reject? | Never — supersede instead |
| `docs/deployment/known-issues.md` | What do we know is wrong and chose not to fix? | Append; strike through when fixed |
| `CLAUDE.md` | What rules are easy to break and cheap to state? | Kept short on purpose |
| Doc comments | Why is *this code* shaped this way? | With the code |

`CLAUDE.md` is **not the blueprint.** It is a digest of rules an agent needs in context
before it has read anything, and it is loaded every session — so every line competes with
the actual work for the same budget. Anything longer than a few lines belongs here, with a
pointer from there. (This file exists because that rule was broken while writing it.)
