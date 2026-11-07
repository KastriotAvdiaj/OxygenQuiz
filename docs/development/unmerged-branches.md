# Unmerged branches

Three lines of work hold finished or nearly finished work that is not in `main`; they are the only
branches on the remote besides `main`. Checked 2026-11-07 against
`origin/main` (`f4283a14`); delete a section here in the same change that merges its branch.

To recheck: `git fetch --prune`, then `git branch -r --no-merged origin/main`. To see what a merge
would conflict on without touching anything: `git merge-tree --write-tree --name-only origin/main origin/<branch>`.

| Branch | Ahead of `main` | Trial merge into `main` | Waiting on |
|---|---|---|---|
| `feature/fact-quizzes` (contains `feature/ai-source-learn`) | 14 commits | **clean** (rechecked 2026-11-07) | An OpenRouter key on the server — see below |
| `feature/featured-quizzes` | 14 commits, cut 2026-10-07 | 7 files conflict | Nothing; it fell behind |
| `feature/paid-plans-entitlements` | 8 commits, cut 2026-10-10 | 15 files conflict | The product-name decision |

## `feature/fact-quizzes` — the AI-sources work, ready when the model is

**What it is,** in order, each building on the last:

- **`feature/ai-source-learn`** (its first 3 commits; that branch is no longer on the remote): Microsoft Learn as
  a second grounding source, asked only when Wikipedia isn't sure (ADR 0038, ADR 0039); the outage
  card's buttons bottom right; DynaPuff on the catalogue's filter headings for signed-out visitors.
- **Fact quizzes** ([`../quiz/fact-quizzes.md`](../quiz/fact-quizzes.md), ADR 0040): *From a set of
  facts* — Capitals of Europe and Peaks of Albania built from Wikidata, no model, in English and
  Albanian with hand-written grammatical forms and several wordings per question style.
- **Wikidata facts under a grounded article**
  ([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md) §2e).

**Merge `feature/fact-quizzes` only** — it contains `feature/ai-source-learn`, which then counts as
merged too.

**What going live needs.** Fact quizzes need nothing: no model, no setting, on as soon as it
deploys. The branch also switches the AI vendor to DeepSeek V4.1 Flash through OpenRouter
(`openrouter-deepseek`) and turns grounding on, both in `appsettings.json` — so production's
`AI_API_KEY` must be an **OpenRouter key** before this deploys, or the AI features switch off.
Source mode stays closed until it is measured on that model (ADR 0037). Steps:
[`../deployment/production-topology.md`](../deployment/production-topology.md), "Worked example:
turning the AI features on".

## `feature/featured-quizzes` — not held, just behind

**What it is.** The quiz home page: four category panels of featured quizzes seeded in every
environment, drawn category art, the *Try Associations* and *Play with friends* cards, and
Associations released to every signed-in player. Described in `docs/quiz/featured-quizzes.md` on
that branch.

**Why it waits.** No decision blocks it; `main` moved on past it (the quiz catalogue was
redesigned since). The one question it raises, a single illustration style for the whole app
(`docs/proposals/app-illustration-style.md` on the branch), is parked on purpose and does not hold
the merge.

**Merging it** means resolving seven files — `QuizService.cs`, `EntityMappers.cs`,
`Quiz-Selection.tsx`, `quiz-discovery.md`, `e2e-testing.md`, the proposals README and the README —
the biggest being the catalogue page, rewritten on both sides; and renumbering its ADR (below).

## `feature/paid-plans-entitlements` — held on purpose

**What it is.** Paid plans end to end: plans and limits, Paddle checkout, webhooks and
reconciliation, the live Paddle configuration, the webhook source-IP gate, and the Terms,
Privacy, Refunds and Contact pages with the site footer. [`../auth/paid-plans.md`](../auth/paid-plans.md)
on that branch is the full description; its §9 is the go-live status and the ordered list of what
is left.

**Why it waits.** The product's name is an open decision: either written permission to use it,
or a rename. Nothing paid is published until that is settled, and the branch stays out of
`main` until then, because merging it puts the pricing page and the legal pages, which carry
the name, on the live domain. A rename also changes the domain, so it changes what Paddle is
asked to approve.

**When it does merge,** expect 15 conflicted files (rate limiting, the exception handler,
`AiQuizWizard`, `query-keys.ts`, the prod compose file, configuration docs among them — `main`
grew all of these since October), and deploy with `BILLING_ENABLED=false` first: the pages go
public and checkout stays off until Paddle has verified the account.

## ADR numbers: both older branches must renumber

ADRs are numbered in `main`'s order and are append-only once merged, so a branch renumbers its own
ADRs **on the branch, before it merges**. Git won't flag it: the file names differ.

| Branch | Its ADRs | Already taken in `main` (or by fact quizzes) |
|---|---|---|
| `feature/featured-quizzes` | `0026-featured-quizzes-are-seeded-once-and-protected` | `0026-the-quiz-overview` |
| `feature/paid-plans-entitlements` | `0026-a-plan-grants-limits-never-permissions`, `0027-a-webhook-is-a-ping-the-provider-is-read-back` | `0026`, `0027-the-client-ip-is-resolved-at-nginx` |

`main` is at 0037; `feature/fact-quizzes` adds 0038–0040. Whichever older branch merges next takes
the next free numbers after whatever has merged by then — 0041 onwards if fact quizzes goes first.
Rename the file and every `ADR 0026` / `adr/0026-…` reference that means it: about 7 references on
featured quizzes (two docs, the seeder, `Quiz.cs`, one test) and about 14 on paid plans (the
billing services, `paid-plans.md`, the payments proposal, `classroom.md`).

**After each of the older two merges,** check the database model once — each adds a migration
(`AddQuizFeaturedKey`; `AddBilling` and `AddBillingWebhookEvents`) and the EF snapshot is merged
by text, not by EF. From `OxygenBackend/QuizAPI`, `dotnet ef migrations has-pending-model-changes`
should report none, and the backend tests should pass. Fact quizzes adds no migration.

## Leftover branch names

None. The 15 branches that were fully merged were deleted from GitHub on 2026-11-07, so the remote
holds `main` and the three branches above (checked 2026-11-07). A clone that fetched before then still lists them until
`git fetch --prune origin`.
