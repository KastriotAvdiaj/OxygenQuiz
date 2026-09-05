import SplitFlapText from "@/components/SplitFlapText";

export interface QuizLoadingViewProps {
  /**
   * The phrases the board flips between. TWO OR MORE, or nothing animates — SplitFlapText
   * only flips on a phrase change, so a single-word board renders and then sits still.
   * Uppercase: the flip charset is A–Z 0–9, so lowercase letters land as a dead tile.
   * Every phrase is padded to the longest one, so keep them close in length — the padding
   * shows as blank tiles.
   */
  words?: string[];
  /** What a screen reader announces. The board itself is decorative flipping tiles. */
  label?: string;
  /** Extra classes on the centering wrapper. */
  className?: string;
}

/**
 * THE loading screen of the quiz flow — one component, every waiting moment:
 * QuizPage and GuestQuizPage while the session is created, QuizInterface for the gap
 * between two questions, and both results wrappers while the finished session loads.
 * They used to be four near-identical cards with four slightly different strings, which is
 * how "Preparing your quiz…" and "Preparing your question…" ended up impossible to tell
 * apart in a bug report. It lives here, above quiz-taking-process/ and quiz-results/,
 * because it belongs to both. Change the loading look here.
 *
 * No card: the board IS the visual. Wrapping it in `quiz-card-elevated` boxed a mechanical
 * object inside a soft panel and fought the tiles' own relief.
 *
 * flex-1 rather than h-screen — the layout already pads for the fixed header and sizes to
 * the dynamic viewport (docs/RESPONSIVE.md).
 */
export const QuizLoadingView = ({
  words = ["LOADING", "QUESTION"],
  label = "Loading",
  className = "",
}: QuizLoadingViewProps) => (
  <div
    className={`flex flex-1 w-full items-center justify-center px-4 ${className}`.trim()}
    role="status"
    aria-live="polite">
    <SplitFlapText
      words={words}
      // padTo 0 → the board is exactly as wide as the longest phrase, no trailing blanks.
      padTo={0}
      // A clamp() string rides straight through to --split-flap-font-size, and every tile
      // dimension is in em — so this one value is the whole mobile story. At the 34px
      // ceiling the widest sensible phrase (~10 tiles) is still under 280px.
      fontSize="clamp(20px, 7vw, 44px)"
      // ~1s between flips: long enough to read, short enough that a fast fetch still
      // shows one flip rather than a frozen board.
      cycleDelay={1000}
      charset="alpha"
      flipsPerChar={5}
      // The board stays dark in BOTH themes, on purpose — it reads as a physical object,
      // the way a departure board does. Wiring it to hsl(var(--card)) was the obvious move
      // and it looked wrong twice over: in dark mode the tiles all but vanished into the
      // background (--card #1a1a1e on --background #121214), and in light mode white tiles
      // on a white page left nothing but a smudge of drop shadow, because every highlight
      // and shadow in SplitFlapText's CSS is drawn for a dark face. These are the dark
      // theme's --card / --foreground values, frozen.
      tileColor="hsl(240 6% 11%)"
      textColor="hsl(240 10% 96%)"
      aria-hidden="true"
    />
    <span className="sr-only">{label}</span>
  </div>
);
