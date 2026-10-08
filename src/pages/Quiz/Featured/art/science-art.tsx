import type { CSSProperties } from "react";
import { ACCENT_FILL, FAINT, FILL, LINE } from "./strokes";

/**
 * The rocket is drawn upright in its own coordinates (centre line x = 1290, nose at y = 18,
 * flames ending at y = 470) and then turned to climb up and to the right, scaled down, into the
 * band above the tiles: on a desktop the Easy → Expert tiles cover the middle of the card, so
 * only the strip above them and a sliver below show. Upright on a launch pad, it sat entirely
 * behind the Expert tile.
 */
const X = 1290;
const ROCKET_TRANSFORM = "translate(1290 98) rotate(60) scale(0.74) translate(-1290 -180)";
/** Where the flames end, after that transform — the start of the smoke trail. */
const TAIL = { x: 1103, y: 204 };

/** A stage's outline: straight sides up to an ogive nose. */
function stagePath(cx: number, w: number, top: number, bottom: number, nose: number) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  return (
    `M${l},${bottom} L${l},${top + nose} ` +
    `C${l},${top + nose * 0.35} ${cx - w * 0.18},${top} ${cx},${top} ` +
    `C${cx + w * 0.18},${top} ${r},${top + nose * 0.35} ${r},${top + nose} L${r},${bottom}Z`
  );
}

/** Seams across a stage. */
function Bands({ cx, w, ys }: { cx: number; w: number; ys: readonly number[] }) {
  return ys.map((y) => (
    <line key={y} x1={cx - w / 2} y1={y} x2={cx + w / 2} y2={y} {...LINE} strokeOpacity={0.5} />
  ));
}

/** The shadow side of a round body: a strip of fill down its right. */
function Shade({ cx, w, top, bottom }: { cx: number; w: number; top: number; bottom: number }) {
  return <rect x={cx + w * 0.18} y={top} width={w * 0.32} height={bottom - top} fill="currentColor" fillOpacity={0.28} />;
}

/** An engine bell under a stage. */
function Bell({ cx, y, w }: { cx: number; y: number; w: number }) {
  return <path d={`M${cx - w * 0.3},${y} L${cx - w / 2},${y + 16} L${cx + w / 2},${y + 16} L${cx + w * 0.3},${y}Z`} {...FILL} />;
}

/** A lattice grid fin sticking out of a booster, `dir` = -1 to the left, 1 to the right. */
function GridFin({ x, y, dir }: { x: number; y: number; dir: -1 | 1 }) {
  const w = 16 * dir;
  return (
    <>
      <rect x={Math.min(x, x + w)} y={y} width={16} height={16} {...LINE} />
      {[1, 2, 3].map((i) => (
        <g key={i}>
          <line x1={x + (w / 4) * i} y1={y} x2={x + (w / 4) * i} y2={y + 16} {...FAINT} strokeOpacity={0.5} />
          <line x1={x} y1={y + 4 * i} x2={x + w} y2={y + 4 * i} {...FAINT} strokeOpacity={0.5} />
        </g>
      ))}
    </>
  );
}

const CORE = { w: 46, top: 18, bottom: 318 };
const BOOSTER = { w: 40, top: 120, bottom: 318, offset: 44 };

function Booster({ side }: { side: -1 | 1 }) {
  const { w, top, bottom } = BOOSTER;
  const cx = X + side * BOOSTER.offset;
  const outer = cx + (side * w) / 2;
  return (
    <>
      <path d={stagePath(cx, w, top, bottom, 46)} {...LINE} />
      <Shade cx={cx} w={w} top={top + 40} bottom={bottom} />
      <Bands cx={cx} w={w} ys={[top + 46, 200, 262, 300]} />
      {[0, 1].map((i) => (
        <line key={i} x1={cx - w / 2 + 8 + i * 24} y1={top + 60} x2={cx - w / 2 + 8 + i * 24} y2={top + 74} {...LINE} strokeOpacity={0.5} />
      ))}
      <GridFin x={outer} y={top + 50} dir={side} />
      {/* A landing leg, folded against the side. */}
      <path d={`M${outer},${bottom - 30} L${outer + side * 18},${bottom + 8}`} {...LINE} />
      <Bell cx={cx - 10} y={bottom} w={18} />
      <Bell cx={cx + 10} y={bottom} w={18} />
    </>
  );
}

function Core() {
  const { w, top, bottom } = CORE;
  return (
    <>
      <path d={stagePath(X, w, top, bottom, 64)} {...LINE} />
      <Shade cx={X} w={w} top={top + 50} bottom={bottom} />
      <Bands cx={X} w={w} ys={[top + 64, 98, 112, 150, 250, 300]} />
      {/* The interstage, a solid band between the upper stage and the first. */}
      <rect x={X - w / 2} y={98} width={w} height={14} fill="currentColor" fillOpacity={0.45} />
      <line x1={X} y1={top + 64} x2={X} y2={98} {...FAINT} />
      {[160, 176, 192].map((y) => (
        <line key={y} x1={X - 14} y1={y} x2={X - 4} y2={y} {...LINE} strokeOpacity={0.45} />
      ))}
      <Bell cx={X - 12} y={bottom} w={20} />
      <Bell cx={X + 12} y={bottom} w={20} />
    </>
  );
}

/** One flame per stage: amber, with a white-hot core. */
function Plumes() {
  return [X - BOOSTER.offset, X, X + BOOSTER.offset].map((cx) => (
    <g key={cx}>
      <path
        className="text-cta"
        d={`M${cx - 18},336 C${cx - 26},380 ${cx - 10},430 ${cx},470 C${cx + 10},430 ${cx + 26},380 ${cx + 18},336Z`}
        fill="currentColor"
        fillOpacity={cx === X ? 0.95 : 0.8}
      />
      <path d={`M${cx - 7},336 C${cx - 10},360 ${cx - 4},390 ${cx},410 C${cx + 4},390 ${cx + 10},360 ${cx + 7},336Z`} fill="currentColor" fillOpacity={0.85} />
    </g>
  ));
}

/**
 * The smoke trail: puffs along a curve from the flames down to the bottom edge, growing as they
 * fall behind. Each puff is outlined, then all are covered — inset by the stroke — in one flat
 * tint of the panel colour, so only the trail's outer silhouette shows (overlapping translucent
 * fills would stack up).
 */
const PUFFS = Array.from({ length: 22 }, (_, i) => {
  const t = i / 21;
  // A quadratic curve from the tail, bowing left, to the bottom edge.
  const [x0, y0, cx, cy, x1, y1] = [TAIL.x, TAIL.y, 900, 250, 760, 400];
  const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1 + Math.sin(i * 2.3) * 8;
  const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1 + Math.cos(i * 3.1) * 6;
  return { x, y, r: 10 + t * 46 + Math.abs(Math.sin(i * 1.7)) * 8 };
}).reverse();
const CLOUD_FILL: CSSProperties = { fill: "color-mix(in srgb, currentColor 16%, var(--panel))" };

function Exhaust() {
  return (
    <>
      {PUFFS.map((p) => (
        <circle key={`o${p.x}`} cx={p.x} cy={p.y} r={p.r} {...LINE} />
      ))}
      {PUFFS.map((p) => (
        <circle key={`f${p.x}`} cx={p.x} cy={p.y} r={p.r - 1.5} style={CLOUD_FILL} />
      ))}
      {PUFFS.filter((_, i) => i % 3 === 0).map((p) => (
        <path
          key={`c${p.x}`}
          d={`M${p.x - p.r * 0.5},${p.y - p.r * 0.15} a${p.r * 0.5},${p.r * 0.5} 0 0 1 ${p.r * 0.8},-${p.r * 0.3}`}
          {...FAINT}
          strokeOpacity={0.4}
        />
      ))}
    </>
  );
}

const STARS: readonly [number, number, number][] = [
  [470, 40, 3], [560, 150, 2], [820, 36, 3], [930, 120, 2], [1040, 30, 3],
  [1460, 170, 2], [1570, 150, 3], [360, 340, 2], [1500, 360, 2],
];

/**
 * Science: a two-stage rocket with side boosters climbing across the top right — flames, grid
 * fins, folded legs, seams and the shaded side of each body — trailing smoke down behind the
 * tiles, with an atom beside the title and a ringed planet in the corner.
 */
export function ScienceArt() {
  return (
    <>
      {STARS.map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} fill="currentColor" fillOpacity={0.5} />
      ))}

      <g transform="translate(680 100)">
        <ellipse rx={78} ry={27} {...LINE} />
        <ellipse rx={78} ry={27} transform="rotate(60)" {...LINE} />
        <ellipse rx={78} ry={27} transform="rotate(-60)" {...LINE} />
        <circle r={13} {...FILL} />
        <g className="text-cta">
          <circle cx={78} cy={0} r={6} {...ACCENT_FILL} />
          <circle cx={-39} cy={67} r={6} {...ACCENT_FILL} />
          <circle cx={-39} cy={-67} r={6} {...ACCENT_FILL} />
        </g>
      </g>

      <g transform="translate(1525 70)">
        <circle r={32} {...FILL} />
        <ellipse rx={58} ry={13} transform="rotate(-18)" {...LINE} />
      </g>

      <Exhaust />
      <g transform={ROCKET_TRANSFORM}>
        <Plumes />
        <Booster side={-1} />
        <Booster side={1} />
        <Core />
      </g>
    </>
  );
}
