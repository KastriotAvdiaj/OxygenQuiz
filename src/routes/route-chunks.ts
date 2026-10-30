/**
 * Chunk importers for public routes whose element is a `React.lazy` component.
 *
 * `React.lazy` only starts its download when the element first renders — which React Router
 * does *after* the route's loader resolves. So a loader that prefetches data and a page that
 * is lazy run one after the other: loader request, then chunk, then render. Measured on
 * `/choose-quiz` (2026-10-30): the page chunks started 2ms after the loader's request finished.
 *
 * Sharing the importer fixes it: `Router.tsx` builds the lazy component from it, and the
 * route's loader calls it too, so the chunk downloads alongside the data. `import()` of one
 * module returns one cached module, so the lazy component resolves at once on render.
 * Dashboard routes don't need this — they use the router's own `lazy`, which already runs in
 * parallel with the loader. See docs/development/loading-states.md §6.
 */
export const loadHomeLayout = () => import("@/layouts/layout");
export const loadQuizSelection = () => import("@/pages/Quiz/Quiz-Selection");
export const loadQuizResults = () =>
  import("@/pages/Quiz/Sessions/components/quiz-results/quiz-results-route-wrapper");
export const loadGuestQuizResults = () =>
  import("@/pages/Quiz/Sessions/components/quiz-results/guest-quiz-results-route-wrapper");

/**
 * Start chunk downloads from a loader. Never rejects: a failed download is left for the lazy
 * component to retry and report through its own error boundary, as it did before.
 */
export const preloadChunks = (...loaders: Array<() => Promise<unknown>>) =>
  Promise.all(loaders.map((load) => load().catch(() => undefined)));
