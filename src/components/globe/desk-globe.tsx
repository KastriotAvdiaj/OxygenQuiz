import { useEffect, useId, useRef } from "react";
import { geoOrthographic, geoPath } from "d3-geo";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/utils/cn";
import { loadLand } from "./land";

/** The drawing box. The globe sits in its top 200×200; the stand's base runs to the bottom. */
const W = 200;
const H = 236;
const CX = 100;
const CY = 100;
const R = 66;
/** The meridian ring's radius, and where it runs: clockwise from `RING_FROM` to `RING_TO`
 *  degrees, 0 being the top — over the upper right, down the side, to the stem at the bottom. */
const RING_R = 80;
const RING_FROM = -35;
const RING_TO = 180;
/** Degrees per second of spin, and the view's latitude (a little from above, like a desk globe). */
const SPIN = 24;
const TILT = -18;
/** The globe leans on its axis, like the real thing: a roll of the projection, so the ball and
 *  its ring stay put and only the map tilts. */
const LEAN = 16;

const polar = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

const ringPath = (() => {
  const [x0, y0] = polar(RING_FROM, RING_R);
  const [x1, y1] = polar(RING_TO, RING_R);
  return `M ${x0} ${y0} A ${RING_R} ${RING_R} 0 1 1 ${x1} ${y1}`;
})();

/**
 * A desk globe that spins: ocean in the theme's primary, land in a lighter tint of it, on a
 * meridian ring and stand in a deeper blue, with a soft halo behind — flat, in the style of the
 * app's other illustrations. Drawn with d3-geo's orthographic projection over the shared land
 * data (`land.ts`); each frame writes the land path's `d` directly, no React state per frame.
 *
 * Used as the "0" in the 404 page's "404". Sized entirely by `className` (the box is 200×236).
 * Until the land data arrives the globe is drawn without continents, so it is never empty.
 * Under reduced motion it is drawn once and holds still.
 */
export function DeskGlobe({ className }: { className?: string }) {
  const landRef = useRef<SVGPathElement>(null);
  const reduceMotion = useReducedMotion();
  const id = useId();
  const clipId = `${id}-clip`;
  const shadeId = `${id}-shade`;

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const projection = geoOrthographic().scale(R).translate([CX, CY]).clipAngle(90);
    const path = geoPath(projection);

    loadLand()
      .then((land) => {
        if (cancelled) return;
        const draw = (longitude: number) => {
          projection.rotate([longitude, TILT, LEAN]);
          landRef.current?.setAttribute("d", path(land) ?? "");
        };
        if (reduceMotion) {
          draw(-10);
          return;
        }
        let start: number | undefined;
        const tick = (now: number) => {
          start ??= now;
          draw(-10 + (SPIN * (now - start)) / 1000);
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      })
      // No data (offline, a failed chunk): the globe stays a plain blue ball.
      .catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [reduceMotion]);

  // The stand's deeper blue: the same mix LiftedButton and ModeCard use for their edges.
  const deep = "var(--primary-edge)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className={cn("pointer-events-none select-none overflow-visible", className)}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
        {/* Light from the upper left: a soft highlight there, a shaded rim lower right. */}
        <radialGradient id={shadeId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="white" stopOpacity="0.22" />
          <stop offset="55%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.22" />
        </radialGradient>
      </defs>

      {/* Halo, offset down-left so the globe reads as standing in front of it. */}
      <circle cx={CX - 8} cy={CY + 6} r={R + 12} fill="hsl(var(--primary) / 0.12)" />

      {/* Stand: stem and base. */}
      <rect x={CX - 3.5} y={CY + RING_R} width={7} height={H - 10 - (CY + RING_R)} rx={2} fill={deep} />
      <rect x={CX - 34} y={H - 12} width={68} height={10} rx={5} fill={deep} />

      <g>
        <circle cx={CX} cy={CY} r={R} fill="hsl(var(--primary))" />
        <g clipPath={`url(#${clipId})`}>
          <path ref={landRef} fill="white" fillOpacity={0.4} />
          <circle cx={CX} cy={CY} r={R} fill={`url(#${shadeId})`} />
        </g>
        <path d={ringPath} fill="none" stroke={deep} strokeWidth={7} strokeLinecap="round" />
      </g>

      {/* Two small sparkles, as in the app's other illustrations. */}
      <circle cx={CX + R + 26} cy={CY - R + 6} r={2.6} fill="hsl(var(--quiz-success))" />
      <circle cx={CX - R - 20} cy={CY + R - 2} r={2.2} fill="hsl(var(--primary))" />
    </svg>
  );
}
