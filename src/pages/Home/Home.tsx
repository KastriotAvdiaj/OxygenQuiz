import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { Pitch } from "./hero/pitch";
import { PITCH_SETTLED_SECONDS, useLandingIntro } from "./use-landing-intro";

// Lazy: d3-geo and the map data are only for this decoration, so they load after the pitch.
const LineGlobe = lazy(() => import("./hero/line-globe"));

/** Bounds on the globe's diameter, in px, whatever the page's proportions. */
const GLOBE_MIN = 360;
const GLOBE_MAX = 1300;
/**
 * How big the globe is: whichever is larger of (a) about 2.7× the room below the
 * globe's top — a bit over a third of it showing — and (b) 70% of the page's width,
 * so a wide, short screen gets a broad dome rather than a small one.
 */
const GLOBE_REACH_FACTOR = 2.7;
const GLOBE_WIDTH_SHARE = 0.7;
/** How far above the middle of the secondary buttons the top of the globe's circle sits, in px:
 *  the dome rises a little behind the "or" divider rather than starting at the buttons. */
const GLOBE_LIFT = 32;
/** The globe's circle is inset in its drawing box (radius 76 of 170): this share of the box's
 *  size sits above the circle's top edge. */
const GLOBE_TOP_INSET = (85 - 76) / 170;

/**
 * The y of the middle of the `[data-globe-anchor]` row (the secondary buttons) inside `root`,
 * from layout offsets rather than `getBoundingClientRect` — the pitch rises in with a transform,
 * and a measurement taken mid-rise would be off by the rise.
 */
function anchorY(root: HTMLElement): number | null {
  const anchor = root.querySelector<HTMLElement>("[data-globe-anchor]");
  if (!anchor) return null;
  let top = anchor.offsetHeight / 2;
  for (let el: HTMLElement | null = anchor; el && el !== root; el = el.offsetParent as HTMLElement | null) {
    top += el.offsetTop;
  }
  return top;
}

/**
 * The landing page: a big headline across the middle of the screen, a subtitle and the actions,
 * on the plain page background. Decisions and reasoning: docs/home/landing-page.md.
 *
 * Until 2026-09-28 a blue wave ran behind it, and the pitch was drawn twice so the text could
 * turn white where it crossed the wave (a masked second copy). The wave went at the owner's
 * request, and the second copy with it; its files are in `_to_delete/wave/`.
 */
export const Home = () => {
  const intro = useLandingIntro();
  const rootRef = useRef<HTMLDivElement>(null);
  // `visible`: the part of the globe's box that is on the page, as fractions of the box — its top
  // share above the page's bottom edge, and on a narrow page only its middle.
  const [globe, setGlobe] = useState<{
    size: number;
    top: number;
    visible: { left: number; right: number; bottom: number };
  } | null>(null);

  // Place the globe so the top of its circle sits GLOBE_LIFT above the middle of the secondary
  // buttons, and size it from the room below that point and the page's width (see
  // GLOBE_REACH_FACTOR). The page clips whatever falls below its bottom edge. Re-measured whenever the page resizes (window, fonts
  // arriving, the header changing height).
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const anchor = anchorY(root);
      if (anchor === null) return;
      const y = anchor - GLOBE_LIFT;
      const reach = root.offsetHeight - y;
      const size = Math.round(
        Math.min(
          GLOBE_MAX,
          Math.max(GLOBE_MIN, reach * GLOBE_REACH_FACTOR, root.offsetWidth * GLOBE_WIDTH_SHARE),
        ),
      );
      const top = Math.round(y - size * GLOBE_TOP_INSET);
      const overhang = Math.max(0, (size - root.offsetWidth) / 2 / size);
      setGlobe({
        size,
        top,
        visible: { left: overhang, right: 1 - overhang, bottom: Math.min(1, (root.offsetHeight - top) / size) },
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    // flex-1 (not min-h-screen): fills the layout's dynamic-viewport column (docs/RESPONSIVE.md).
    // Always DynaPuff, whatever font the visitor picked in their settings: the landing page is
    // the brand's voice, not a place for a reading preference. Both font variables are pinned
    // for this subtree (anything inside that asks for `font-app` gets DynaPuff too), and
    // `font-quiz` sets the family here, since the body's family was computed from the root's
    // variables. Dialogs opened from here portal out of this subtree and keep the user's font.
    // overflow-hidden: clips the globe's lower half at the page's bottom edge.
    <div
      ref={rootRef}
      className="relative flex w-full flex-1 flex-col overflow-hidden font-quiz text-foreground [--font-app:DynaPuff] [--font-quiz:DynaPuff]"
    >
      {/* The globe, as background: rising over the page's bottom edge with its top behind the
          secondary buttons. Out of flow, so nothing moves around it, and under the pitch (z-0 vs
          the pitch's z-10). It waits for the pitch's entrance to finish before it appears
          (`delay`): while the buttons fade in they are see-through, and a globe popping in behind
          them read as being on top of them. */}
      {globe !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2"
          style={{ top: globe.top, width: globe.size, height: globe.size }}
        >
          <Suspense fallback={null}>
            <LineGlobe
              className="h-full w-full"
              delay={intro ? PITCH_SETTLED_SECONDS : 0}
              visible={globe.visible}
            />
          </Suspense>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col">
        <Pitch intro={intro} />
      </div>
    </div>
  );
};
