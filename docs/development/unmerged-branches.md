# Unmerged branches

Two branches hold finished or nearly finished work that is not in `main`. Every other branch
in the repository is already merged and is only a leftover name. Checked 2026-10-11 against
`origin/main`; delete a section here in the same change that merges its branch.

To recheck: `git fetch --prune`, then `git branch -r --no-merged origin/main`.

## `feature/paid-plans-entitlements` — held on purpose

**What it is.** Paid plans end to end: plans and limits, Paddle checkout, webhooks and
reconciliation, the live Paddle configuration, the webhook source-IP gate, and the Terms,
Privacy, Refunds and Contact pages with the site footer. 8 commits ahead of `main`.
[`../auth/paid-plans.md`](../auth/paid-plans.md) on that branch is the full description; its §9
is the go-live status and the ordered list of what is left.

**Why it waits.** The product's name is an open decision: either written permission to use it,
or a rename. Nothing paid is published until that is settled, and the branch stays out of
`main` until then, because merging it puts the pricing page and the legal pages, which carry
the name, on the live domain. A rename also changes the domain, so it changes what Paddle is
asked to approve.

**When it does merge,** deploy with `BILLING_ENABLED=false` first. The pages go public and
checkout stays off until Paddle has verified the account.

## `feature/featured-quizzes` — not held, just not merged yet

**What it is.** The quiz home page: four category panels of featured quizzes seeded in every
environment, drawn category art, the *Try Associations* and *Play with friends* cards, and
Associations released to every signed-in player. 14 commits ahead of `main`, last commit
2026-10-10. Described in `docs/quiz/featured-quizzes.md` on that branch.

**Why it waits.** No decision blocks it. The one open question it raises, a single illustration
style for the whole app (`docs/proposals/app-illustration-style.md` on the branch), is parked
on purpose and does not hold the merge: the drawings stay as they are until a direction is
chosen.

## Merging both: three small things

The two branches were cut from the same `main` and do not contain each other. A trial merge
(`git merge-tree`) of one into the other auto-merges everything, including `Program.cs`,
`ApplicationDbContext.cs`, the EF model snapshot and `Router.tsx`, except two files. The third
item below is the one Git will not report.

1. **`README.md`, one line.** Each branch updated the backend test count in the *Tests & CI*
   row (about 720 on one, about 630 on the other). Neither number is right after the merge:
   run the backend suite and write the real total.
2. **`docs/deployment/known-issues.md`, one hunk.** Both added entries at the same place, near
   the *Paid plans and launch compliance* heading. Keep both sides; nothing overlaps in
   meaning.
3. **Two ADRs are both numbered 0026, and Git merges them silently** because the file names
   differ:
   - `0026-featured-quizzes-are-seeded-once-and-protected.md` (featured quizzes)
   - `0026-a-plan-grants-limits-never-permissions.md` (paid plans, which also adds `0027`)

   Whichever branch merges **second** renumbers its `0026` to the next free number (`0028`
   once both are in) before it merges: rename the file and update every `ADR 0026` and
   `adr/0026-…` reference that means it. That is about 7 references if featured quizzes goes
   second (two docs, the seeder, `Quiz.cs`, one test) and about 14 if paid plans does (the
   billing services, `paid-plans.md`, the payments proposal, `classroom.md`). ADRs are
   append-only once merged, so the renumbering has to happen on the branch, not afterwards.

After the second merge, check the database model once: each branch adds its own migration
(`AddQuizFeaturedKey`; `AddBilling` and `AddBillingWebhookEvents`) and the snapshot is merged
by text, not by EF. From `OxygenBackend/QuizAPI`, `dotnet ef migrations has-pending-model-changes`
should report none, and the backend tests should pass.

## Leftover branch names

Everything else, 18 local and 21 remote branches, is fully merged into `main` and can be
deleted whenever convenient. Three are not what they look like: `ai-creation-density-and-lookup-refactor`
exists only locally (its remote was deleted after the merge), and `docs/known-issues` and
`worktree-lifted-button-disabled-cursor` were never pushed. All three are merged.
