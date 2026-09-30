import { lazy, Suspense } from "react";

// Lazy, and never fatal: d3-geo and the map data are only for this picture. If the chunk can't
// load (the very situation a stale tab after a deploy is in), the "0" stays a plain 0 rather
// than taking the error page down with it.
const DeskGlobe = lazy(() =>
  import("@/components/globe/desk-globe")
    .then((m) => ({ default: m.DeskGlobe }))
    .catch(() => ({ default: () => <span>0</span> })),
);

/**
 * The 404 page's hero: a huge "404" in the display font whose "0" is a spinning desk globe
 * (`DeskGlobe`) — "we looked everywhere". Fluid: the digits are a share of the viewport width,
 * capped, so it fills a phone and doesn't swamp a monitor. The globe is sized in `em` against
 * the digits, so it stays a digit's size at every width; until it loads, a plain "0" holds its
 * place. Read as one image ("404") by screen readers.
 */
export function FourOhFour() {
  return (
    <div
      role="img"
      aria-label="404"
      className="flex select-none items-end justify-center gap-[0.04em] font-quiz text-[clamp(6.5rem,30vw,17rem)] font-bold leading-[0.8] text-foreground"
    >
      <span aria-hidden="true">4</span>
      <span aria-hidden="true" className="inline-flex h-[0.9em] w-[0.76em] items-end justify-center">
        <Suspense fallback={<span className="leading-[0.8]">0</span>}>
          <DeskGlobe className="h-full w-full" />
        </Suspense>
      </span>
      <span aria-hidden="true">4</span>
    </div>
  );
}
