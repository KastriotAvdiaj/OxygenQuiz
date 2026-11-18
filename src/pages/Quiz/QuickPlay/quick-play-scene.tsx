import type { ReactNode } from "react";

/**
 * Quick play's backdrop: a sun, two ranges of mountains and a forested ridge, with the signpost
 * standing on a hill in front (`QuickPlayHill`). In the dark theme, stars as well.
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

/** A layered pine, centred on `x`, standing on `base`. */
const pine = (x: number, base: number, h: number) => {
  const w = h * 0.4;
  const p = (dx: number, dy: number) => `${(x + dx * w).toFixed(1)} ${(base - dy * h).toFixed(1)}`;
  return (
    `M${p(0, 1)} L${p(0.5, 0.62)} L${p(0.28, 0.62)} L${p(0.75, 0.28)} L${p(0.42, 0.28)} L${p(1, 0)} ` +
    `L${p(-1, 0)} L${p(-0.42, 0.28)} L${p(-0.75, 0.28)} L${p(-0.28, 0.62)} L${p(-0.5, 0.62)} Z`
  );
};

/** The ridge's line at `x`, in the 1440 × 400 band. */
// High enough that the trees stand above the hill in front of them (`QuickPlayHill`).
const ridgeAt = (x: number) => 292 + 14 * Math.sin(x / 150) + 7 * Math.sin(x / 47);

/** A forest along the ridge: worked out once, the same on every render. */
const FOREST = (() => {
  const trees: string[] = [];
  for (let x = 6, i = 0; x < 1440; x += 15 + ((i * 7) % 11), i++) {
    const h = 40 + ((i * 13) % 26) + 12 * Math.sin(i * 1.7);
    trees.push(pine(x, ridgeAt(x) + 4, h));
  }
  let ground = `M0 ${ridgeAt(0).toFixed(1)}`;
  for (let x = 20; x <= 1440; x += 20) ground += ` L${x} ${ridgeAt(x).toFixed(1)}`;
  return { trees: trees.join(" "), ground: `${ground} L1440 400 L0 400 Z` };
})();

/** Fixed points in the night sky: x and y in percent of the sky, and a size. */
const STARS: [number, number, number][] = [
  [6, 12, 1.2], [14, 30, 0.8], [22, 8, 1], [31, 22, 0.7], [39, 6, 1.3], [47, 26, 0.8], [55, 14, 1],
  [63, 4, 0.7], [70, 28, 1.1], [77, 10, 0.8], [86, 24, 1], [93, 8, 1.2], [11, 46, 0.7], [35, 40, 0.9],
  [58, 38, 0.7], [81, 44, 0.9], [96, 36, 0.7], [27, 52, 0.6], [67, 50, 0.6],
];

export const QuickPlayBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
    {/* Stars, at night only. */}
    <svg className="absolute inset-x-0 top-0 hidden h-[60%] w-full dark:block" preserveAspectRatio="none" viewBox="0 0 100 100">
      {STARS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r * 0.35} className="fill-foreground/50" />
      ))}
    </svg>

    {/* The sun by day, the moon at night: the same disc. */}
    <div className="absolute right-[8%] top-16 h-14 w-14 rounded-full bg-primary/10 shadow-[0_0_60px_24px_hsl(var(--primary)/0.08)] sm:right-[14%] sm:top-20 sm:h-20 sm:w-20" />

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
      {/* A lighter face on each peak, the side the sun is on. */}
      <path
        className="fill-background/50"
        d="M315 164 L340 180 L326 200 L300 190 Z M765 172 L790 188 L774 208 L748 196 Z M1245 186 L1268 200 L1254 218 L1230 208 Z"
      />
      <path className="fill-primary/40" d={`${FOREST.ground} ${FOREST.trees}`} />
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
