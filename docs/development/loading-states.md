# Loading states

How the app shows a wait today, and the one rule that keeps two waits from stacking up.

The reasoning behind the shape described here — and what it replaced — is in
[ADR 0015](../adr/0015-the-layout-owns-the-route-loading-boundary.md). This file is the
present tense: what to use, and where.

---

## 1. The rule

**Never render a full-page loader yourself.** No page, route wrapper or layout builds its own
centred `LoadingWave`, picks its own `size`, or wraps one in its own `flex items-center`. Use
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
| `components/ui/loading-wave.tsx` — **`LoadingWave`** | In-panel waits: a tab body, a list inside a card, a drawer | The primitive. Sized `sm`/`md` in place. Do not use it for a full page — that is what `PageLoading` wraps. |
| `components/ui/Spinner.tsx` — **`Spinner`** | The admin dashboard | The dashboard's own idiom, used by ~18 screens. Not worth converting; just keep it centred. |
| `components/ui/split-flap-loader.tsx` — **`SplitFlapLoader`** | Nothing, currently | A set-piece, kept for a moment that wants one. It only animates on a phrase *change* — a single-entry `words` array renders a board that never moves. |

## 3. The boundaries

There are three, and which one catches a suspending chunk decides how much of the screen goes
away.

1. **`Provider.tsx`** — above `RouterProvider`, so it can only replace *the whole app*. That is
   correct for exactly one moment: the very first paint, before any layout exists. It also backs
   the auth gate's `renderLoading`.
2. **`layouts/layout.tsx` (`HomeLayout`)** — wraps its children. Every public page is a
   `React.lazy` chunk, and this is what catches them, so a route swaps the content column and
   leaves the header, background and account overlay mounted. **A route that renders a lazy
   element outside a layout falls through to (1) and blanks the app** — that is the failure this
   boundary exists to prevent, and the thing to check when adding a route.
3. **`AppRoot.tsx` and `Dashboard.tsx`** — the dashboard's equivalents, using `Spinner`.

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
the page's, and shows even on `headerBehavior="hidden"`). It creeps toward 90% and only completes
when the navigation does — there is no percentage to report, and inventing one gets caught every
time the server is slow.

## 6. Prefetch instead of a second loader

A page that loads its chunk and *then* starts a query from cold shows two waits in a row, however
well the two loaders match. The fix is not a better loader; it is starting the request earlier.
Give the route a loader that warms the query, so the fetch overlaps the chunk download and the
component's `useQuery` is never `isLoading`:

```ts
// loaders/quiz-results.loader.tsx
await queryClient.prefetchQuery(sessionResultsQueryOptions(sessionId));
```

Two things to copy along with it:

- **Define the query in one place.** `sessionResultsQueryOptions` is shared by the loader and the
  hook. A loader that warms a *nearly* matching key fills the cache with something the component
  never reads, and the only symptom is the loader coming back.
- **`prefetchQuery`, not `ensureQueryData`.** `ensureQueryData` rejects, so a failed fetch throws
  out of the loader into the route's `errorElement` and past whatever error state the component
  already has. The loader's job is to start the request early, not to take over deciding what
  failure looks like.

Currently prefetched: the quiz catalogue (`quiz-selection.loader.tsx`), the user list
(`users.loader.tsx`), and both results routes (`quiz-results.loader.tsx`).

## 7. Sizing and the viewport

`PageLoading` fills the layout's flex column (`flex-1`), not the viewport. Use `h-screen`/`100vh`
nowhere — they over-measure on mobile and double-count the header padding. `fullScreen` uses
`.app-shell-viewport`, which sizes to the *dynamic* viewport. See
[`../RESPONSIVE.md`](../RESPONSIVE.md).

One consequence worth naming: one size for every full-page wait means the wordmark is `xl`
everywhere it applies, including waits that used to render smaller inside a layout. That is the
point. If it ever feels too large in a narrow column, change it in `PageLoading` — once, not per
call site.
