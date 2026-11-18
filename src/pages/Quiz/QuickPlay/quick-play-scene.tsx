import type { ReactNode } from "react";

/**
 * Quick play's scenery: the page's own background and a hill for the signpost to stand in
 * (`QuickPlayHill`). The post is the picture.
 *
 * A sun, stars, a forest and two mountain ranges were drawn and taken out again on 2026-11-18:
 * they competed with the post, and the mountains, scaled to cover a wide screen, lost their peaks
 * and read as a flat ridge. Theme tokens only, so light and dark follow the theme
 * (docs/quiz/quick-play.md, "The signpost").
 */

/** The sky, as classes for the page root: the page's own background, a breath of primary at the horizon. */
export const QUICK_PLAY_SKY = "bg-gradient-to-b from-background via-background to-primary/5";

/**
 * The hill the signpost stands on, in the page's flow under the boards, so the pole can run down
 * into it however many boards there are. A smooth mound, so stretching it to any width is fine.
 * `children` sit on the hill (the link to the full list).
 */
export const QuickPlayHill = ({ children }: { children?: ReactNode }) => (
  <div className="relative -mt-16 h-32 sm:-mt-20 sm:h-40">
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="fill-primary"
        d="M0 120 C 260 96, 470 70, 620 46 C 680 36, 760 36, 820 46 C 970 70, 1180 96, 1440 120 L1440 200 L0 200 Z"
      />
    </svg>
    <div className="relative flex h-full items-end justify-center pb-5 sm:pb-7">{children}</div>
  </div>
);
