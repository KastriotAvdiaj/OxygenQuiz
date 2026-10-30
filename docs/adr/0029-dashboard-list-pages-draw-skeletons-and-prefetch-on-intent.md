# 29. Dashboard list pages draw skeletons and start loading on intent

Date: 2026-10-21
Status: Accepted — amends [ADR 0015](0015-the-layout-owns-the-route-loading-boundary.md) for the
admin dashboard's Quizzes and Questions pages

## Context

ADR 0015 chose continuity over immediacy: keep the old page until the new one can arrive whole,
with a progress bar to say a click landed, and no skeletons. That holds for pages whose wait is a
chunk plus one fast query.

The admin dashboard's two list pages don't fit it. Opening the dashboard ran three different waits
back to back:

1. `/dashboard` redirects to `/dashboard/questions` and the route chunk downloads — the content
   column is **empty**, nav rail only, and (in production then) no progress bar in the dashboard.
2. The page mounts and returns a **full-height `BlobLoader`** until the category, difficulty and
   language lookups have all loaded — header and table included, though neither needs them.
3. The list query starts only now, and shows a **second `BlobLoader`** inside the card.

Quizzes did the same. Three different looks for one wait, the longest of them over content that
didn't need to wait at all.

## Decision

**1. These pages draw skeletons for their own data.** The shape of both is fixed — a header, a
table or card list of known page size, a filter panel — so `TableSkeleton`,
`QuestionListSkeleton` and `FilterPanelSkeleton` (`pages/Dashboard/Components/list-page-skeletons.tsx`)
stand in for each part, built on `components/ui/skeleton.tsx`. The full-page gate is gone: the
header renders at once, the filter panel waits for the lookups, the list waits for its page.
Skeletons keep the app's 140ms appearance delay (`SkeletonGroup`), so a fast load shows nothing.

**2. The route loaders start the data and don't wait for it.** `routes/dashboard-prefetch.ts`
prefetches the lookups and page 1 alongside the chunk, fire-and-forget. Awaiting would hold the old
page on screen until the data arrived — the right trade in ADR 0015, the wrong one once the page
can draw its own placeholder.

**3. Pointing at a link starts the page.** Hovering or focusing the drawer's *Admin Dashboard* link
or a dashboard nav item imports the page's chunk and runs the same prefetch. The few hundred
milliseconds between pointing and clicking are often the whole wait.

## Consequences

- **Skeletons are scoped to a page's own data, never the route transition.** Swapping the current
  page for a skeleton while the next one loads would flash on every fast click — ADR 0015 still
  governs that moment, with the progress bar.
- **The page and its prefetch must build the same query.** Both list pages' first query now comes
  from a shared builder (`api/admin-quizzes-query.ts`, `api/question-filter-query.ts`); a prefetch
  that warms a nearly-matching key is silently useless.
- **Prefetch checks the cached user is an admin first.** Child loaders run in parallel with
  `adminAuthLoader`, and a 403 toasts. On a cold load (no user cached yet) nothing is prefetched
  and the page fetches for itself, as before.
- **Hover prefetch costs a request when nobody clicks.** Acceptable: admin-only, the lookups are
  cached for an hour (`LOOKUP_STALE_TIME`), and page 1 is ten rows. Touch devices get no hover and
  fall back to the loader prefetch.
- Other pages keep ADR 0015's approach until they show the same symptom.
