import { useEffect, useRef } from "react";
import { geoEquirectangular, geoGraticule, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { loadLand } from "@/components/globe/land";
import { ACCENT_FILL, ACCENT_LINE, ART_H, ART_W, FAINT, FILL, LINE } from "./strokes";

/** The globe: half risen over the panel's bottom edge on the right, like the landing page's. */
const R = 270;
const CX = 1270;
const CY = 350;
/** Facing Europe and the Mediterranean from a little above — Prishtina near the middle. */
const projection = geoOrthographic().scale(R).translate([CX, CY]).clipAngle(90).rotate([-22, -38, 0]);
const globePath = geoPath(projection);
const globeGrid = globePath(geoGraticule10()) ?? "";

/** A flat map's grid across the whole card, very faint — the "atlas page" behind the globe. */
const flat = geoEquirectangular().scale(ART_W / (2 * Math.PI)).translate([ART_W / 2, ART_H / 2]);
const flatGrid = geoPath(flat)(geoGraticule().step([15, 15])()) ?? "";

/** Flights out of Prishtina and one more, as the landing globe's amber arcs (lon, lat). */
const ROUTES: readonly [[number, number], [number, number]][] = [
  [[21.17, 42.67], [-0.12, 51.5]], // London
  [[21.17, 42.67], [31.24, 30.04]], // Cairo
  [[12.5, 41.9], [37.62, 55.75]], // Rome → Moscow
];
const arcs = ROUTES.map(([from, to]) => {
  const [x1, y1] = projection(from) ?? [0, 0];
  const [x2, y2] = projection(to) ?? [0, 0];
  const lift = Math.hypot(x2 - x1, y2 - y1) * 0.45;
  return { x1, y1, x2, y2, d: `M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2 - lift} ${x2},${y2}` };
});

/**
 * Geography: the landing page's globe — d3-geo over the shared Natural Earth land
 * (`components/globe/land.ts`) — standing still, with a compass rose on the left. The grid,
 * outline and arcs draw straight away; the coastlines join them when the land data arrives,
 * written to the path's `d` directly as the landing globe does.
 */
export function GeographyArt() {
  const landRef = useRef<SVGPathElement>(null);

  // The land data is a lazily loaded chunk — the outside system this waits on.
  useEffect(() => {
    let cancelled = false;
    loadLand().then((land) => {
      if (!cancelled) landRef.current?.setAttribute("d", globePath(land) ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <path d={flatGrid} {...FAINT} strokeOpacity={0.08} />

      <circle cx={CX} cy={CY} r={R} {...LINE} />
      <path d={globeGrid} {...FAINT} />
      <path ref={landRef} {...FILL} />
      <g className="text-cta">
        {arcs.map((a) => (
          <g key={a.d}>
            <path d={a.d} {...ACCENT_LINE} />
            <circle cx={a.x1} cy={a.y1} r={5} {...ACCENT_FILL} />
            <circle cx={a.x2} cy={a.y2} r={5} {...ACCENT_FILL} />
          </g>
        ))}
      </g>

      <g transform="translate(600 105)">
        <circle r={56} {...LINE} />
        <circle r={42} {...FAINT} />
        <path d="M0,-74 L13,0 L0,74 L-13,0Z" {...FILL} />
        <path d="M-74,0 L0,10 L74,0 L0,-10Z" {...LINE} />
        <path d="M0,-74 L13,0 L-13,0Z" className="text-cta" fill="currentColor" fillOpacity={0.85} />
      </g>
    </>
  );
}
