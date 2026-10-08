import { ACCENT_FILL, ACCENT_LINE, FAINT, FILL, LINE } from "./strokes";

const GROUND = 350;

/** A pyramid: its outline, the shaded right-hand face, and courses of stone across it. */
function Pyramid({ x, base, height }: { x: number; base: number; height: number }) {
  const top = GROUND - height;
  const courses: { y: number; half: number }[] = [];
  for (let y = GROUND - 26; y > top + 18; y -= 26) {
    courses.push({ y, half: (base / 2) * (1 - (GROUND - y) / height) });
  }
  return (
    <>
      <path d={`M${x - base / 2},${GROUND} L${x},${top} L${x + base / 2},${GROUND}Z`} {...LINE} />
      <path d={`M${x},${top} L${x + base / 2},${GROUND} L${x + base * 0.12},${GROUND}Z`} {...FILL} />
      {courses.map((c) => (
        <line key={c.y} x1={x - c.half} y1={c.y} x2={x + c.half} y2={c.y} {...FAINT} />
      ))}
    </>
  );
}

const SUN = { x: 1130, y: 95, r: 42 };
const RAYS = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);

/** A fluted column, broken off at the top, on its plinth. */
const COLUMN = { x: 560, top: 70, w: 80 };

/**
 * History: three pyramids under the sun on the right, a broken column and a fallen stone on the
 * left, on a line of desert.
 */
export function HistoryArt() {
  const { x, top, w } = COLUMN;
  return (
    <>
      <g className="text-cta">
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} {...ACCENT_FILL} />
        {RAYS.map((a) => (
          <line
            key={a}
            x1={SUN.x + Math.cos(a) * 54}
            y1={SUN.y + Math.sin(a) * 54}
            x2={SUN.x + Math.cos(a) * 74}
            y2={SUN.y + Math.sin(a) * 74}
            {...ACCENT_LINE}
          />
        ))}
      </g>

      <Pyramid x={1150} base={270} height={195} />
      <Pyramid x={1420} base={340} height={270} />
      <Pyramid x={1580} base={180} height={125} />

      <path d={`M0,${GROUND} Q400,${GROUND - 18} 800,${GROUND - 4} T1600,${GROUND - 8}`} {...FAINT} />
      <line x1={0} y1={GROUND} x2={1600} y2={GROUND} {...LINE} />

      <path
        d={`M${x},${GROUND - 28} L${x},${top} L${x + 20},${top + 16} L${x + 40},${top - 6} L${x + 58},${top + 13} L${x + w},${top - 2} L${x + w},${GROUND - 28}Z`}
        {...LINE}
      />
      {[1, 2, 3, 4].map((i) => (
        <line key={i} x1={x + (w / 5) * i} y1={top + 12} x2={x + (w / 5) * i} y2={GROUND - 28} {...FAINT} />
      ))}
      <rect x={x - 16} y={GROUND - 28} width={w + 32} height={28} rx={3} {...FILL} />
      <path d={`M700,${GROUND} l18,-20 l32,4 l14,16`} {...FILL} />
    </>
  );
}
