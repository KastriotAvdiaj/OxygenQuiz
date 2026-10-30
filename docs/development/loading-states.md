# Loading states

How the app shows a wait today, and the one rule that keeps two waits from stacking up.

The reasoning behind the shape described here — and what it replaced — is in
[ADR 0015](../adr/0015-the-layout-owns-the-route-loading-boundary.md). This file is the
present tense: what to use, and where.

---

## 1. The rule

**Never render a full-page loader yourself.** No page, route wrapper or layout builds its own
centred `BlobLoader`, picks its own `size`, or wraps one in its own `flex items-center`. Use
`PageLoading`, or `QuizLoadingView` if you are inside the quiz flow and want to name the wait.

This is a rule about handovers, not about tidiness. A wait is almost never one wait: a route
resolves, *then* a chunk loads, *then* a query settles, and each step is a different component
rendering a loader. When each one picks its own size and centring, the same word changes size
and jumps down the screen between steps, and it reads as three things happening rather than one
thing continuing. Agreement by convention does not survive a fourth call site — so there is no
`size` prop to agree about.

## 2. The components

| Component | Use for | Notes |
|---|---|---|
| `components/ui/page-loading.tsx` — **`PageLoading`** | Anything that holds the screen while it resolves | Owns the size, the centring and the appearance delay. `fullScreen` only for a boundary that owns the viewport before any layout exists. |
| `pages/Quiz/Sessions/components/quiz-loading-view.tsx` — **`QuizLoadingView`** | The quiz flow's waits | A thin name over `PageLoading`. Exists so a call site can say *which* wait it is via `label`. **Change the look in `PageLoading`, not here.** |
| `components/ui/blob-loader.tsx` — **`BlobLoader`** | In-panel waits: a tab body, a list inside a card, a drawer — and, since 2026-10-17, every dashboard wait that used `Spinner` at `md`/`lg`/`xl` | The primitive: a ball crossing between two bars, fused by an SVG goo filter. `primary` by default, transparent, so it sits on either theme. Sized `sm`/`md`/`lg` in place; every size steps down on phones and up on large screens. Do not use it for a full page — that is what `PageLoading` wraps. |
| `components/ui/loading-wave.tsx` — **`LoadingWave`** | One text effect: multiplayer's "Next question coming" line | The previous primitive (a bouncing `LOADING` wordmark). Replaced by `BlobLoader` after the landing-page redesign because it no longer fit the look; kept and storied, like `SplitFlapLoader`. |
| `components/ui/Spinner.tsx` — **`Spinner`** | Inline busy marks only: inside a button while it submits, beside a short "Writing questions…"/"Thinking…" line, the notification bell | Was the dashboard's page and panel loader on ~25 screens; those moved to `BlobLoader` (2026-10-17), same size name, same centring. What's left is `sm`, where a 2:1 blob doesn't sit in a line of text or a button face the way a 16px ring does. |
| `components/ui/skeleton.tsx` — **`Skeleton`**, **`SkeletonGroup`** | A page's own data wait when the page's shape is known: the admin Quizzes and Questions pages (§2.1) | `Skeleton` is one pulsing `bg-muted` block (no pulse under reduced motion). `SkeletonGroup` wraps a set of them with the 140ms appearance delay and a single `role="status"`. Page-specific shapes live beside the page — `pages/Dashboard/Components/list-page-skeletons.tsx`. |
| `components/ui/split-flap-loader.tsx` — **`SplitFlapLoader`** | Nothing, currently | A set-piece, kept for a moment that wants one. It only animates on a phrase *change* — a single-entry `words` array renders a board that never moves. |

### 2.1 Skeletons: a page's own data, never the route transition

Since 2026-10-21 ([ADR 0029](../adr/0029-dashboard-list-pages-draw-skeletons-and-prefetch-on-intent.md)),
the admin **Quizzes** and **Questions** pages draw skeletons instead of loaders. The rules:

- **Only for the page's own data, once the page has mounted.** The header renders at once; each
  part that waits (the filter panel on the lookups, the list on its page) shows a skeleton of its
  own shape. Never a whole-page gate — the full-height `BlobLoader` these pages used to return
  hid a header that needed nothing.
- **Never in place of the old page during a route change.** That moment stays with the progress
  bar (§5); a skeleton there would flash on every fast click.
- **Same size as what replaces it.** Row count = page size, so the swap moves nothing.
- **Same 140ms delay** (§4) — `SkeletonGroup` handles it.

`/choose-quiz` (since 2026-10-30) draws a grid of skeleton cards (`quiz-card-skeleton.tsx`) for
the one case its loader doesn't cover — a `?category=` arrival, or a failed prefetch. Normally
it arrives with page 1 cached and never shows it.

Every other page still uses the loaders in the table above.

## 3. The boundaries

There are three, and which one catches a suspending chunk decides how much of the screen goes
away.

1. **`Provider.tsx`** — above `RouterProvider`, so it can only replace *the whole app*. That is
   correct for exactly one moment: the very first paint, before any layout exists. It also backs
   the auth gate's `renderLoading` — a wait kept short by not asking the server at all when the
   visitor has no session ([`../auth/session-hint.md`](../auth/session-hint.md)).
2. **`layouts/layout.tsx` (`HomeLayout`)** — wraps its children. Every public page is a
   `React.lazy` chunk, and this is what catches them, so a route swaps the content column and
   leaves the header, background and account overlay mounted. **A route that renders a lazy
   element outside a layout falls through to (1) and blanks the app** — that is the failure this
   boundary exists to prevent, and the thing to check when adding a route.
3. **`AppRoot.tsx` and `Dashboard.tsx`** — the dashboard's equivalents, using `BlobLoader` at `xl`
   in a centred `min-h-[60vh]` box (they were `Spinner` until 2026-10-17). Not yet `PageLoading`,
   so they don't have its 140ms delay — the next step if the dashboard's route waits flicker.
   Dashboard pages mostly use the router's route-level `lazy`, not `React.lazy`, so they never
   suspend into these at all: the router holds the old page until the chunk (and any loader)
   resolves — which is §5's gap, covered the same way.

## 4. Nothing paints for 140ms

`PageLoading` mounts at `opacity-0` and fades in on a timer. A wait too short to notice shows
nothing at all, rather than flashing a loader between two screens — which is what "the loader
jumps" usually describes. The element is mounted the whole time, so the fade costs no layout
shift when it does arrive.

`RouteProgressBar` uses the same delay for the same reason.

## 5. The gap no loading screen can cover

React Router runs a route's `loader` **before** the new route renders. During that, the *current*
page is still on screen, fully painted and fully frozen. No fallback can cover it — the thing
that would render the fallback does not exist yet — so a slow loader looks exactly like a click
that missed.

`common/RouteProgressBar.tsx` is the answer: a hairline on the shell, driven by
`useNavigation()`, rendered by `HomeLayout` outside the header (it reports the shell's state, not
the page's, and shows even on `headerBehavior="hidden"`) — and by `DashboardLayout` in both its
branches, since 2026-10-21. Before that the dashboard had none, so clicking Edit or View on a quiz
froze the list for the chunk download with nothing on screen to say the click had landed. It creeps toward 90% and only completes
when the navigation does — there is no percentage to report, and inventing one gets caught every
time the server is slow.

## 6. Prefetch instead of a second loader

A page that loads its chunk and *then* starts a query from cold shows two waits in a row, however
well the two loaders match. The fix is not a better loader; it is starting the request earlier.
Give the route a loader that warms the query — and, for a `React.lazy` page, starts the chunk
too — so data and code download side by side and the component's `useQuery` is never
`isLoading`:

```ts
// loaders/quiz-results.loader.tsx
await queryClient.prefetchQuery(sessionResultsQueryOptions(sessionId));
```

Three things to copy along with it:

- **Define the query in one place.** `sessionResultsQueryOptions` is shared by the loader and the
  hook. A loader that warms a *nearly* matching key fills the cache with something the component
  never reads, and the only symptom is the loader coming back. This happened: until 2026-10-30
  the catalogue's loader awaited `/quiz/public` while `/choose-quiz` read `/quiz/search`, so
  every visit waited one round trip for data that was thrown away and then fetched cold anyway.
  For a page whose query is built from state (search, filters, sort, page), put the builder in
  its own module and have the page and the loader both call it — `pages/Quiz/catalogue-query.ts`
  is the reference, pinned by `loaders/__tests__/quiz-selection.loader.test.ts`. Keep that module
  free of UI imports, or the loader drags the page's components into the entry bundle.
- **`prefetchQuery`, not `ensureQueryData`.** `ensureQueryData` rejects, so a failed fetch throws
  out of the loader into the route's `errorElement` and past whatever error state the component
  already has. The loader's job is to start the request early, not to take over deciding what
  failure looks like. The one deliberate exception is `quiz.loader.tsx`, which `fetchQuery`s the
  quiz itself so a missing quiz is the route's 404. `users.loader.tsx` still uses
  `ensureQueryData` without such a reason (known-issues.md, "Loading states").
- **Start the chunk, when the element is `React.lazy`.** React Router renders the element only
  after the loader resolves, and `React.lazy` only starts downloading when it renders — so on
  its own the chunk queues *behind* the loader's request. Measured on `/choose-quiz` (2026-10-30):
  the page chunks started 2ms after the loader's request ended. Put the route's importers in
  `routes/route-chunks.ts`, build the lazy component from them in `Router.tsx`, and await
  `preloadChunks(...)` in the loader beside the prefetch. Routes using the router's own `lazy`
  (the dashboards) don't need this: the router already runs `lazy` and `loader` in parallel.
Currently prefetched: the quiz catalogue — page 1, the three filter lookups, and the layout and
page chunks (`quiz-selection.loader.tsx`) — the user list (`users.loader.tsx`), both results
routes with their chunks (`quiz-results.loader.tsx`), the dashboard quiz page's
quiz and question list (`quiz.loader.tsx`), the Classic editor's quiz and questions on both
dashboards (`quiz-edit.loader.ts`), and the admin Quizzes and Questions pages' lookups and first
page (`routes/dashboard-prefetch.ts`).

**Awaited or not.** The loaders above await their prefetch, so the old page stays until the new
one can arrive whole. The two admin list pages don't: they draw skeletons (§2.1), so their
loader only *starts* the data and lets the page show at once.

**Admin-only data needs an admin check in the prefetch.** Child route loaders run in parallel
with the dashboard's `adminAuthLoader`, and every failed request toasts. `dashboard-prefetch.ts`
reads the cached user and does nothing unless it is an Admin or SuperAdmin.

### 6.1 Prefetch on intent

Hovering or focusing a link to an admin list page — the drawer's **Admin Dashboard** link, or a
dashboard nav item — runs the same prefetch and imports the page's chunk
(`prefetchDashboardPage` in `routes/dashboard-prefetch.ts`). The time between pointing and
clicking is often the whole wait. A hover that doesn't turn into a click costs a request; on
touch there is no hover, and the loader prefetch covers it.

To add a page: give it a shared query builder, add its entry to `PAGES` in that file, and use
the same chunk importer in `Router.tsx` so both warm one module.

**When a skeleton instead of awaiting?** When the page's shape is known and its own data is the
slow part — see §2.1. For a chunk plus one fast query, await the prefetch and let the progress
bar cover it; a skeleton that shows for 300ms and then reflows is the flash §4 exists to
prevent.

### 6.2 When the page changes what it shows: keep the old results

The loader covers arriving. Inside a page — the next page of a list, a filter, a sort, a search —
the new query key is cold, and a plain `useQuery` is `isLoading` again: the results collapse into
a loader and come back, and the content below jumps twice. Keep what is on screen instead:

```ts
const { data, isLoading, isPlaceholderData } = useQuery({
  ...catalogueQueryOptions(state),
  placeholderData: keepPreviousData,
});
```

- **`isLoading` now means "nothing to show at all"** — the first load with no prefetch. That is
  the only time a loader replaces the results.
- **Say that the shown results are stale**: dim them (`opacity-60` with a `transition-opacity`)
  and set `aria-busy` while `isPlaceholderData`. Not a loader on top.
- **Animate the change of results, not the change of query.** With `keepPreviousData` the query
  changes first and the results a moment later; key the animated list on what it shows (the
  `/choose-quiz` grid is keyed by its quiz ids), or the entrance plays on the stale results and
  not on the new ones. See `motion.md`, "Lists".

Doing this: `/choose-quiz`, the play history (`get-user-sessions.ts`), match history
(`Multiplayer/api/matches.ts`). Not yet: the lobby's quiz picker, the classroom board picker, My
Quizzes, and the admin Quizzes and Questions lists (known-issues.md, "Loading states"). The admin
lists draw a skeleton per page (§2.1) — the same rule applies when they change pages: the
skeleton is for the page's first data, not for every page after it.

## 7. Sizing and the viewport

`PageLoading` fills the layout's flex column (`flex-1`), not the viewport. Use `h-screen`/`100vh`
nowhere — they over-measure on mobile and double-count the header padding. `fullScreen` uses
`.app-shell-viewport`, which sizes to the *dynamic* viewport. See
[`../RESPONSIVE.md`](../RESPONSIVE.md).

One consequence worth naming: one size for every full-page wait means the loader is `xl`
everywhere it applies, including waits that used to render smaller inside a layout. That is the
point. `xl` is itself responsive — 64px wide on phones, 80px from `sm`, 96px from `md`, 112px from
`lg`, 128px from `xl` — so it
never needs a per-page override. If it ever feels wrong in a narrow column, change it in
`PageLoading` — once, not per call site.

## 8. Why `BlobLoader` uses an SVG filter

The effect it is based on is the CSS "gooey" trick: `filter: blur() contrast()` plus
`mix-blend-mode: darken`. That only works as black shapes on an opaque white box, so it can't be
`primary`, can't sit on the dark theme, and couldn't sit on the landing page's blue wave (removed 2026-09-28). `BlobLoader`
does the same thing to the *alpha* channel instead (`feGaussianBlur` then a steep
`feColorMatrix` threshold), so the loader is transparent and takes its colour from `variant`.
The blur radius is in px — an SVG filter cannot use percentages — so each size carries its own.
With `prefers-reduced-motion` the ball is parked between the bars.
