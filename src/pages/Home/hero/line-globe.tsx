import { useEffect, useRef } from "react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/utils/cn";
import { createConnections, type VisibleBox } from "./globe-connections";

/** The drawing's own coordinate space; the element is sized by `className`. */
const SIZE = 170;
const RADIUS = 76;
/**
 * The view's centre sits at 15°S, so the band that shows over the page's bottom edge (the top of
 * the globe, from the far north down to about 30°N on a wide screen) is the land-heavy northern
 * mid-latitudes. Centring it further north put the Arctic Ocean — empty — at the top.
 */
const TILT = 15;
/** Where the globe starts facing, and how far the intro spin carries it (degrees). */
const START_LONGITUDE = -20;
const INTRO_SPIN = 180;
/** How fast the intro spin dies away, and the slow drift it settles into (degrees/second). */
const INTRO_DECAY = 1.6;
const DRIFT = 6;
/**
 * How solid the land is: 1 is the full primary colour. Under 1 so the globe stays a background
 * behind the buttons; raise it to try a flatter, bolder look.
 */
const LAND_FILL_OPACITY = 0.45;
const FULL_BOX: VisibleBox = { left: 0, right: 1, bottom: 1 };
/** The pop-in: grows from 60% to full size over this long (seconds). */
const POP_SECONDS = 0.6;

/**
 * The landing page's line globe (docs/home/landing-page.md, "The globe"): an outline of the
 * Earth — grid lines and coastlines in the theme blue, no fill — as the page's background, half
 * risen over its bottom edge (Home.tsx places and sizes it). It pops in with a quick spin that
 * eases into a slow, endless turn.
 *
 * It is drawn in a fixed 170-unit box and scaled to whatever size Home gives it, so every stroke
 * is `non-scaling-stroke`: at 1000px wide the lines stay a pixel or so thick instead of growing
 * with the drawing.
 *
 * Drawn with d3-geo's orthographic projection from Natural Earth's 1:110m land outlines
 * (`world-atlas`, ~55KB of TopoJSON). Both the drawing code and the data load lazily: Home
 * imports this file with `React.lazy`, and the map data is a dynamic import of its own, so the
 * headline and buttons never wait on either. The outline circle is drawn straight away; the
 * coastlines join it when the data arrives.
 *
 * Each frame sets the two paths' `d` directly on the DOM — no React state per frame. Under
 * reduced motion it draws once, facing the start longitude, and never animates. `requestAnimationFrame`
 * stops by itself in a background tab.
 */
export default function LineGlobe({
  className,
  delay = 0,
  visible = FULL_BOX,
}: {
  className?: string;
  /** Seconds to wait, after the map data arrives, before the pop-in starts. */
  delay?: number;
  /**
   * The part of the globe's box that is on the page, as fractions of the box (0–1). The page
   * shows only the top of the globe, and on a phone not its sides either; the connection arcs
   * are only started between cities in that part.
   */
  visible?: VisibleBox;
}) {
  const popRef = useRef<SVGGElement>(null);
  const gridRef = useRef<SVGPathElement>(null);
  const coastRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const linksRef = useRef<SVGGElement>(null);
  // Read by the animation loop each frame, so a resize changes where arcs may start without
  // restarting the animation.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    let cleanupLinks = () => {};

    const projection = geoOrthographic()
      .scale(RADIUS)
      .translate([SIZE / 2, SIZE / 2])
      .clipAngle(90);
    const path = geoPath(projection);
    const graticule = geoGraticule10();

    import("world-atlas/land-110m.json").then(({ default: atlas }) => {
      if (cancelled) return;
      const land = feature(atlas, atlas.objects.land);

      const draw = (longitude: number) => {
        projection.rotate([longitude, TILT, 0]);
        gridRef.current?.setAttribute("d", path(graticule) ?? "");
        coastRef.current?.setAttribute("d", path(land) ?? "");
      };

      if (reduceMotion) {
        draw(START_LONGITUDE);
        return;
      }

      // The arcs between cities (globe-connections.ts). Not under reduced motion: they are
      // nothing but motion.
      const links = linksRef.current ? createConnections(linksRef.current, projection) : null;
      cleanupLinks = () => links?.clear();

      let start: number | undefined;
      const tick = (now: number) => {
        start ??= now + delay * 1000;
        if (now < start) {
          frame = requestAnimationFrame(tick);
          return;
        }
        const t = (now - start) / 1000;
        // A fast spin that decays exponentially, on top of the steady drift it leaves behind.
        draw(START_LONGITUDE + DRIFT * t + INTRO_SPIN * (1 - Math.exp(-t * INTRO_DECAY)));

        // Arcs begin once the globe has popped in.
        const width = svgRef.current?.clientWidth ?? 0;
        if (links && t > POP_SECONDS && width > 0) {
          const v = visibleRef.current;
          links.update(t, { left: v.left * SIZE, right: v.right * SIZE, bottom: v.bottom * SIZE }, SIZE / width);
        }

        const k = Math.min(1, t / POP_SECONDS);
        const eased = 1 - Math.pow(1 - k, 3);
        const pop = popRef.current;
        if (pop) {
          pop.style.transform = `scale(${0.6 + 0.4 * eased})`;
          pop.style.opacity = String(eased);
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanupLinks();
    };
    // `delay` is read once, when the animation starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      className={cn("pointer-events-none select-none text-primary", className)}
    >
      <g
        ref={popRef}
        // Scales about the globe's centre. Starts hidden unless motion is reduced, so the first
        // animated frame is the one that shows it.
        style={{ transformOrigin: "50% 50%", opacity: reduceMotion ? 1 : 0 }}
        fill="none"
        stroke="currentColor"
      >
        {/* Quieter than the prototype's: it is a background now, and the "or" and the buttons
            sit on its top edge. */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeWidth={1.5} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
        <path ref={gridRef} strokeOpacity={0.18} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {/* Land filled with the primary colour (LAND_FILL_OPACITY), outlined a touch stronger. */}
        <path
          ref={coastRef}
          fill="currentColor"
          fillOpacity={LAND_FILL_OPACITY}
          strokeOpacity={0.7}
          strokeWidth={1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Games across the world: arcs between cities, in the landing page's amber so they
            read over the blue land in both themes (globe-connections.ts). */}
        <g ref={linksRef} className="text-cta" />
      </g>
    </svg>
  );
}
