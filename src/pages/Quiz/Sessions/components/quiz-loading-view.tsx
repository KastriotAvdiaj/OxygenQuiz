import { PageLoading } from "@/components/ui";

export interface QuizLoadingViewProps {
  /**
   * The word that waves. Uppercase, and short — `LoadingWave` staggers one animation per
   * character, so a sentence turns into a long ripple rather than a loader. Callers pass the
   * default; the prop exists for a screen that genuinely needs different copy.
   */
  text?: string;
  /** What a screen reader announces. Say which wait this is — the word on screen doesn't. */
  label?: string;
  /** Extra classes on the centering wrapper. */
  className?: string;
}

/**
 * THE loading screen of the quiz flow — one component, every waiting moment:
 * QuizPage and GuestQuizPage while the session is created, QuizInterface before the FIRST
 * question, QuizPageRouteWrapper and SharedQuizRouteWrapper while they resolve who is
 * playing, and both results wrappers while the finished session loads. They used to be
 * several near-identical cards with slightly different strings, which is how "Preparing your
 * quiz…" and "Preparing your question…" ended up impossible to tell apart in a bug report.
 * It lives here, above quiz-taking-process/ and quiz-results/, because it belongs to both.
 *
 * It is now a thin name over `PageLoading` (`components/ui/page-loading.tsx`), which is what
 * the rest of the app waits with — the shell's Suspense boundary, the auth gate, the layout's
 * route boundary. That is the whole point of the indirection: entering a quiz used to run the
 * shell's `xl` wordmark → a route wrapper's `lg` one → this one, the same word changing size
 * and vertical position twice inside a second and a half. There is one size and one position
 * now, and no call site can pick a different one. **Change the loading look in `PageLoading`,
 * not here** — this file exists only so the quiz flow can say what it is waiting for.
 *
 * `PageLoading` also holds the appearance delay, so a wait too short to notice paints nothing
 * at all rather than flickering a loader between two screens.
 *
 * The split-flap board this flow used before was not deleted — it is `SplitFlapLoader` in
 * `components/ui`, for a moment that wants a set-piece rather than a loader
 * (docs/quiz/quiz-playing-architecture.md §3b).
 */
export const QuizLoadingView = ({
  text = "LOADING",
  label = "Loading",
  className = "",
}: QuizLoadingViewProps) => (
  <PageLoading text={text} label={label} className={className} />
);
