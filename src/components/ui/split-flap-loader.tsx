import SplitFlapText from "@/components/SplitFlapText";

export interface SplitFlapLoaderProps {
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
 * A full-bleed loading screen built from a mechanical split-flap board, like a departure
 * board resolving.
 *
 * It is a **feature loader, not the default one** — `LoadingWave` is what the app uses for
 * ordinary waiting, everywhere from the Provider boot screen to the dashboard lists and the
 * quiz flow. This one is louder and slower by design: it takes a second per flip and it fills
 * the screen, which makes it right for a moment the player is meant to sit through and wrong
 * for a spinner-shaped gap. It briefly *was* the quiz flow's loader; it lost that job for
 * exactly this reason (docs/quiz/quiz-playing-architecture.md §3b).
 *
 * Living in `components/ui` rather than the quiz folder because that is the whole point of
 * keeping it: it belongs to whichever feature wants a set-piece next, not to the one that
 * happened to build it.
 *
 * No card: the board IS the visual. Wrapping it in `quiz-card-elevated` boxed a mechanical
 * object inside a soft panel and fought the tiles' own relief.
 *
 * flex-1 rather than h-screen — a layout that already pads for a fixed header and sizes to
 * the dynamic viewport (docs/RESPONSIVE.md).
 */
export const SplitFlapLoader = ({
  words = ["LOADING", "PLEASE WAIT"],
  label = "Loading",
  className = "",
}: SplitFlapLoaderProps) => (
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
