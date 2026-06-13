// Error and 404 pages are shared between the public/quiz-facing area and the
// admin dashboard (e.g. `DashboardErrorElement` is the errorElement for both
// `/quiz/:quizId/play` and the `/dashboard/*` routes). To keep each error page
// consistent with the area it appears in, we pick the font zone from the current
// path rather than hardcoding one:
//   - `/dashboard*`            → the app/dashboard font (`--font-app`)
//   - everything else (quiz)   → the quiz/interface font (`--font-quiz`)
//
// We read `window.location` directly (not `useLocation`) so this is safe to call
// from a render-time error fallback even if the router context is unavailable.
export const getErrorFontClass = (): "font-app" | "font-quiz" =>
  window.location.pathname.startsWith("/dashboard") ? "font-app" : "font-quiz";
