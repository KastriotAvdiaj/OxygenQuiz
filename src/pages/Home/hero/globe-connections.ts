import { geoDistance, geoInterpolate, type GeoProjection } from "d3-geo";

/**
 * The landing globe's "games across the world": short arcs that rise off the surface between two
 * cities, land with a small pulse, hold, and fade — a few at a time, a new one every so often.
 * Read as players meeting in a lobby from different countries; nothing is looked up, it is
 * decoration (docs/home/landing-page.md, "The globe").
 *
 * Drawn into the `<g>` handed to `createConnections`, by setting attributes each frame (no React
 * state). Everything is positioned in the globe's 170-unit drawing box; sizes meant in *pixels*
 * (dot radii, the pulse) are converted with `unit` (box units per pixel), because the drawing
 * is scaled to whatever size the page gives it.
 */

type LonLat = [number, number];

/** The part of the 170-unit drawing box that is on the page. */
export type VisibleBox = { left: number; right: number; bottom: number };

/** Where arcs start and end: big cities, spread so most of the visible band has some. */
const CITIES: LonLat[] = [
  [21.17, 42.66], // Prishtina
  [-0.13, 51.51], // London
  [13.4, 52.52], // Berlin
  [2.35, 48.86], // Paris
  [-3.7, 40.42], // Madrid
  [12.5, 41.9], // Rome
  [28.98, 41.01], // Istanbul
  [37.62, 55.75], // Moscow
  [31.24, 30.04], // Cairo
  [3.38, 6.52], // Lagos
  [36.82, -1.29], // Nairobi
  [55.27, 25.2], // Dubai
  [72.88, 19.08], // Mumbai
  [77.21, 28.61], // Delhi
  [116.4, 39.9], // Beijing
  [139.69, 35.69], // Tokyo
  [126.98, 37.57], // Seoul
  [103.82, 1.35], // Singapore
  [151.21, -33.87], // Sydney
  [-74.0, 40.71], // New York
  [-79.38, 43.65], // Toronto
  [-87.63, 41.88], // Chicago
  [-118.24, 34.05], // Los Angeles
  [-123.12, 49.28], // Vancouver
  [-99.13, 19.43], // Mexico City
  [-46.63, -23.55], // São Paulo
  [-58.38, -34.6], // Buenos Aires
  [-21.9, 64.15], // Reykjavík
  [18.07, 59.33], // Stockholm
  [-149.9, 61.22], // Anchorage
];

/** At most this many arcs at once, and a new one tried this often (seconds). */
const MAX_ARCS = 3;
const SPAWN_EVERY = 1.2;
/** An arc's life, in seconds from its start: it draws, holds, then fades. */
const DRAW = 1.1;
const HOLD_UNTIL = 2.4;
const FADE_UNTIL = 3.2;
/** How far apart the two ends may be (radians of arc): close enough to stay on screen, far
 *  enough to read as a line rather than a dot. */
const MIN_APART = (12 * Math.PI) / 180;
const MAX_APART = (65 * Math.PI) / 180;
/** An end must face the viewer by this much (radians from the view's centre) to be picked —
 *  generous, because the page shows the globe's top rim, which is far from the centre. */
const MAX_FROM_CENTRE = (84 * Math.PI) / 180;
/** Samples along each arc. */
const STEPS = 40;
/** In pixels: the end dots, the travelling head, and how far the landing pulse spreads. */
const DOT_PX = 2.6;
const HEAD_PX = 2;
const PULSE_PX = 10;
const PULSE_SECONDS = 0.7;

const SVG = "http://www.w3.org/2000/svg";

type Arc = {
  from: LonLat;
  to: LonLat;
  born: number;
  interpolate: (t: number) => LonLat;
  /** How high the arc rises at its middle, as a share of the globe's radius. */
  lift: number;
  el: {
    group: SVGGElement;
    line: SVGPathElement;
    fromDot: SVGCircleElement;
    toDot: SVGCircleElement;
    head: SVGCircleElement;
    pulse: SVGCircleElement;
  };
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createConnections(layer: SVGGElement, projection: GeoProjection) {
  const arcs: Arc[] = [];
  let lastSpawn = -Infinity;

  const make = <K extends keyof SVGElementTagNameMap>(tag: K, parent: Element, attrs: Record<string, string>) => {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    parent.appendChild(el);
    return el;
  };

  /** The view's centre, as a point on the globe (the inverse of the projection's rotation). */
  const viewCentre = (): LonLat => {
    const [lambda, phi] = projection.rotate();
    return [-lambda, -phi];
  };

  /** Screen position of a point `lift` (share of the radius) above the surface. */
  const lifted = (p: LonLat, lift: number): [number, number] | null => {
    const xy = projection(p);
    if (!xy) return null;
    const [cx, cy] = projection.translate();
    return [cx + (xy[0] - cx) * (1 + lift), cy + (xy[1] - cy) * (1 + lift)];
  };

  const facing = (p: LonLat, centre: LonLat, slack = 0) => geoDistance(p, centre) < Math.PI / 2 + slack;

  /**
   * Try to start one arc between two cities that are both on the visible part of the globe:
   * facing the viewer, and inside `view` (the part of the drawing box that is on the page, in
   * box units — most of the globe is below the fold, and on a phone it is wider than the page).
   */
  const spawn = (now: number, view: VisibleBox) => {
    const centre = viewCentre();
    const onScreen = CITIES.filter((c) => {
      if (geoDistance(c, centre) > MAX_FROM_CENTRE) return false;
      const xy = projection(c);
      return !!xy && xy[1] < view.bottom - 4 && xy[0] > view.left + 4 && xy[0] < view.right - 4;
    });
    if (onScreen.length < 2) return;

    for (let tries = 0; tries < 12; tries++) {
      const from = onScreen[Math.floor(Math.random() * onScreen.length)];
      const to = onScreen[Math.floor(Math.random() * onScreen.length)];
      const apart = geoDistance(from, to);
      if (from === to || apart < MIN_APART || apart > MAX_APART) continue;
      if (arcs.some((a) => a.from === from || a.to === to)) continue;

      const group = make("g", layer, {});
      const el = {
        group,
        line: make("path", group, { fill: "none", "stroke-width": "1.5", "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" }),
        fromDot: make("circle", group, { fill: "currentColor" }),
        toDot: make("circle", group, { fill: "currentColor" }),
        head: make("circle", group, { fill: "currentColor" }),
        pulse: make("circle", group, { fill: "none", "stroke-width": "1.25", "vector-effect": "non-scaling-stroke" }),
      };
      arcs.push({ from, to, born: now, interpolate: geoInterpolate(from, to), lift: 0.04 + 0.22 * (apart / Math.PI), el });
      return;
    }
  };

  /**
   * One frame. `now` in seconds; `view` the visible part of the box; `unit` box units per CSS
   * pixel.
   */
  const update = (now: number, view: VisibleBox, unit: number) => {
    if (now - lastSpawn >= SPAWN_EVERY && arcs.length < MAX_ARCS) {
      lastSpawn = now;
      spawn(now, view);
    }

    const centre = viewCentre();
    for (let i = arcs.length - 1; i >= 0; i--) {
      const arc = arcs[i];
      const age = now - arc.born;
      if (age > FADE_UNTIL) {
        arc.el.group.remove();
        arcs.splice(i, 1);
        continue;
      }

      const drawn = easeInOut(Math.min(1, age / DRAW));
      const fade = age <= HOLD_UNTIL ? 1 : 1 - (age - HOLD_UNTIL) / (FADE_UNTIL - HOLD_UNTIL);
      arc.el.group.setAttribute("opacity", fade.toFixed(3));

      // The line: sampled up to how far it has drawn, lifted into an arc, broken wherever it
      // passes behind the globe (a lifted point can peek over the horizon, hence the slack).
      let d = "";
      let pen = false;
      let headXY: [number, number] | null = null;
      const last = Math.max(1, Math.ceil(STEPS * drawn));
      for (let s = 0; s <= last; s++) {
        const t = Math.min(drawn, s / STEPS);
        const p = arc.interpolate(t);
        const xy = facing(p, centre, 0.05) ? lifted(p, arc.lift * Math.sin(Math.PI * t)) : null;
        if (!xy) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${xy[0].toFixed(2)},${xy[1].toFixed(2)}`;
        pen = true;
        headXY = xy;
      }
      arc.el.line.setAttribute("d", d);
      arc.el.line.setAttribute("stroke", "currentColor");

      const dot = (el: SVGCircleElement, p: LonLat, r: number, show: boolean) => {
        const xy = show && facing(p, centre) ? projection(p) : null;
        el.setAttribute("r", xy ? (r * unit).toFixed(3) : "0");
        if (xy) {
          el.setAttribute("cx", xy[0].toFixed(2));
          el.setAttribute("cy", xy[1].toFixed(2));
        }
      };
      dot(arc.el.fromDot, arc.from, DOT_PX, true);
      dot(arc.el.toDot, arc.to, DOT_PX, drawn >= 1);

      // The head travels with the drawing edge, and goes once the arc has landed.
      if (headXY && drawn < 1) {
        arc.el.head.setAttribute("r", (HEAD_PX * unit).toFixed(3));
        arc.el.head.setAttribute("cx", headXY[0].toFixed(2));
        arc.el.head.setAttribute("cy", headXY[1].toFixed(2));
      } else {
        arc.el.head.setAttribute("r", "0");
      }

      // The landing pulse: a ring that spreads and fades from the far end.
      const sinceLanding = age - DRAW;
      const toXY = facing(arc.to, centre) ? projection(arc.to) : null;
      if (sinceLanding >= 0 && sinceLanding <= PULSE_SECONDS && toXY) {
        const k = sinceLanding / PULSE_SECONDS;
        arc.el.pulse.setAttribute("r", ((DOT_PX + (PULSE_PX - DOT_PX) * k) * unit).toFixed(3));
        arc.el.pulse.setAttribute("cx", toXY[0].toFixed(2));
        arc.el.pulse.setAttribute("cy", toXY[1].toFixed(2));
        arc.el.pulse.setAttribute("stroke", "currentColor");
        arc.el.pulse.setAttribute("stroke-opacity", (1 - k).toFixed(3));
      } else {
        arc.el.pulse.setAttribute("r", "0");
      }
    }
  };

  const clear = () => {
    for (const arc of arcs) arc.el.group.remove();
    arcs.length = 0;
  };

  return { update, clear };
}
