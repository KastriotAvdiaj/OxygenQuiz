import { LoadingWave } from "@/components/ui";

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
 * question, and both results wrappers while the finished session loads. They used to be four
 * near-identical cards with four slightly different strings, which is how "Preparing your
 * quiz…" and "Preparing your question…" ended up impossible to tell apart in a bug report.
 * It lives here, above quiz-taking-process/ and quiz-results/, because it belongs to both.
 * Change the loading look here.
 *
 * It renders `LoadingWave`, which is what the rest of the app waits with — the Provider boot
 * screen, the dashboard lists, the profile panels, and `QuizPageRouteWrapper` immediately
 * before this component mounts. That last one is the reason: entering a quiz used to run
 * LoadingWave → a split-flap board → the same board again, three loaders inside a second and
 * a half. A wait should not announce itself as a different thing each time it happens.
 *
 * The board was not deleted — it is `SplitFlapLoader` in `components/ui`, for a moment that
 * wants a set-piece rather than a spinner (docs/quiz/quiz-playing-architecture.md §3b).
 *
 * `size="lg"` matches QuizPageRouteWrapper's, so the handover from route to page is
 * invisible: the same word, the same size, still waving.
 *
 * flex-1 rather than h-screen — the layout already pads for the fixed header and sizes to
 * the dynamic viewport (docs/RESPONSIVE.md).
 */
export const QuizLoadingView = ({
  text = "LOADING",
  label = "Loading",
  className = "",
}: QuizLoadingViewProps) => (
  <div
    className={`flex flex-1 w-full items-center justify-center px-4 ${className}`.trim()}
    role="status"
    aria-live="polite">
    <LoadingWave text={text} size="lg" />
    <span className="sr-only">{label}</span>
  </div>
);
