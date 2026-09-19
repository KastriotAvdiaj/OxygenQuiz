# 15. The layout owns the route loading boundary

Date: 2026-09-18
Status: Accepted

## Context

Every page in the public shell is a `React.lazy` chunk (`routes/Router.tsx`). None of them had
a `Suspense` boundary of their own, so the nearest one was the app shell's — declared in
`Provider.tsx`, **above** `RouterProvider`:

```tsx
<React.Suspense fallback={<full-viewport LoadingWave size="xl" />}>
  <ErrorBoundary>…<RouterProvider /></ErrorBoundary>
</React.Suspense>
```

A boundary in that position cannot replace *a page*. It can only replace *the app*. So opening
any route tore the shell down to a bare loading screen — header, background, account overlay
and all — and built it back a moment later.

Finishing a quiz showed what that costs, because the results route also fetched from cold:

1. `navigate("/quiz/results/:id")` runs the route's auth loader. The finished quiz screen stays
   on screen, fully painted and fully frozen. Nothing indicates a click was heard.
2. The lazy chunk suspends and hits the shell boundary: **the whole app blanks** to `LOADING`
   at `text-6xl`, with no header.
3. The chunk arrives, the header comes back, and `useGetSessionResults` starts from cold —
   nothing prefetched it — so the component paints `LOADING` again, now at `text-4xl`, in a
   different place on the screen.
4. The results appear.

Two loading screens in a row, at two sizes, with the shell disappearing between them. Entering
a quiz had the same shape for the same reason: shell `xl` → `QuizPageRouteWrapper`'s `lg` with
`py-16` → `QuizLoadingView`'s `lg` with `flex-1`, the same word changing size and vertical
position twice inside a second and a half.

The sizes had drifted because every call site chose its own. `quiz-loading-view.tsx` even
documented that its `size="lg"` "matches QuizPageRouteWrapper's, so the handover is
invisible" — true of that one pair, and false of the shell boundary both of them hand over
from. Agreement by convention does not survive a fourth call site.

## Decision

Four changes, which are one change:

**1. One component owns every full-page wait.** `components/ui/page-loading.tsx` — `PageLoading`
— fixes the size, the centring and the delay. `QuizLoadingView` becomes a thin name over it so
the quiz flow can still say *which* wait it is; the route wrappers' hand-rolled
`LoadingWave size="lg"` blocks are gone. No call site can pick a size any more, because there is
no size prop.

**2. The boundary moves into the layout.** `HomeLayout` wraps its children in `Suspense`. A
route chunk now replaces the content column; the header, the background and the overlay stay
mounted. `Provider.tsx` keeps its boundary for what it is actually for — the very first paint,
before any layout exists.

**3. The results route starts its own fetch.** `loaders/quiz-results.loader.tsx` prefetches
`['quiz-session-results', id]` (and the guest equivalent) while the chunk downloads, so the
component's `useQuery` is never `isLoading`. The query key is defined once, in
`sessionResultsQueryOptions`, because a loader that warms a *nearly* matching key fills the
cache with something the component never reads and the only symptom is the loader coming back.

**4. Nothing paints for the first 140ms.** `PageLoading` mounts at `opacity-0` and fades in on
a timer. A wait too short to notice now shows nothing at all instead of flashing a loader
between two screens — which is what "the loading component jumps" actually described.

Stage 1 above — the frozen page while a route loader runs — is not a loading screen problem at
all: the next route has not rendered, so no fallback can cover it. `common/RouteProgressBar.tsx`
puts a hairline on the shell instead, driven by `useNavigation()`, with the same 140ms delay.

## Consequences

- **A slow route now holds the old page longer before showing anything.** That is the trade:
  continuity over immediacy. The progress bar is what makes it legible, and it is the only
  feedback during a loader run — if it is ever removed, that moment goes silent again.
- **The layout boundary only helps routes that render inside a layout.** A route whose element
  is a bare lazy component still falls through to the shell boundary and still blanks the app.
  The dashboard has its own boundaries (`AppRoot`, `Dashboard`) and is unaffected.
- **`prefetchQuery`, not `ensureQueryData`.** `ensureQueryData` rejects, which would throw a
  failed results fetch out of the loader into the route's `errorElement` and past the wrapper's
  own "Unable to Load Results" screen. The loader starts the request early; it does not take
  over deciding what failure looks like.
- **The guest loader prefetches the GET only.** Viewing guest results is what *spends* the free
  attempt, and that `/finish` call stays in the component. A loader must be safe to re-run.
- **One size for every full-page wait means `xl` everywhere it applies**, including waits that
  previously rendered smaller inside a layout. That is the point, and it is the thing to
  revisit first if the wordmark ever feels too large in a narrow column — in `PageLoading`,
  once, not per call site.
