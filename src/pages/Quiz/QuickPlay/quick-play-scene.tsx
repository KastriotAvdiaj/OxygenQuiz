import type { ReactNode } from "react";

/**
 * Quick play's backdrop: two ranges of mountains, with the signpost standing on a hill in front
 * (`QuickPlayHill`). Nothing else: a sun, stars and a forest were drawn and taken out the same
 * evening (2026-11-18) — the post is the picture, and they competed with it.
 *
 * <b>Two colours and the wood.</b> The page's own background, the primary at a few strengths for
 * the land, and the wood of the boards and pole (`quick-play-view.tsx`) as the one accent. The
 * first version (2026-11-18) was a pink dusk with violet mountains; the app is black, white and
 * its blue everywhere else, and the scene was the only place that wasn't. Theme tokens only, so
 * light and dark come for free (docs/quiz/quick-play.md, "The signpost").
 *
 * Everything here is decoration — `aria-hidden`, no pointer events. The sky is the page's own
 * background (`QUICK_PLAY_SKY`), so it fills however tall the signpost grows; the mountains are a
 * fixed-height band along the bottom, so they keep their size on a phone and on a wide screen.
 */

/** The sky, as classes for the page root: the page's own background, a breath of primary at the horizon. */
export const QUICK_PLAY_SKY = "bg-gradient-to-b from-background via-background to-primary/5";

export const QuickPlayBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <svg
      className="absolute inset-x-0 bottom-0 h-[19rem] w-full sm:h-[24rem]"
      viewBox="0 0 1440 400"
      preserveAspectRatio="xMidYMax slice"
    >
      <path
        className="fill-primary/10"
        d="M0 200 L110 135 L200 175 L330 68 L440 155 L560 100 L690 190 L820 82 L950 165 L1080 50 L1200 145 L1320 92 L1440 160 L1440 400 L0 400 Z"
      />
      <path
        className="fill-primary/20"
        d="M0 268 L95 212 L190 248 L315 164 L420 236 L540 186 L640 250 L765 172 L880 246 L1005 196 L1120 256 L1245 186 L1345 238 L1440 208 L1440 400 L0 400 Z"
      />
      {/* A lighter face on each peak, on its lit side. */}
      <path
        className="fill-background/50"
        d="M315 164 L340 180 L326 200 L300 190 Z M765 172 L790 188 L774 208 L748 196 Z M1245 186 L1268 200 L1254 218 L1230 208 Z"
      />
    </svg>
  </div>
);

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
