import { ACCENT_FILL, ART_H, FAINT, FILL, LINE, TINT } from "./strokes";

type Spine = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** How the cover is drawn: solid, faintly tinted, or outline only. */
  cover: "solid" | "tint" | "outline";
  /** Width of the band at each end of the spine. */
  band: number;
  /** A second rule just inside the left band. */
  doubleRule: boolean;
  /** What's on the spine: a title (as lines), a row of rings, a label, or a gilt dot. */
  mark: { kind: "title"; length: number } | { kind: "rings" } | { kind: "label" } | { kind: "dot" };
};

/** Five columns of books stacked spines-out, filling the card edge to edge: [left x, width]. */
const COLUMNS: readonly [number, number][] = [
  [0, 330],
  [338, 370],
  [716, 360],
  [1084, 300],
  [1392, 260],
];

/**
 * The stacks, built once with a seeded random number generator — the same wall on every render
 * and every machine, with no two books alike.
 */
const SPINES: readonly Spine[] = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spines: Spine[] = [];
  for (const [left, width] of COLUMNS) {
    let y = ART_H + 4;
    while (y > -40) {
      const h = 22 + Math.round(rnd() * 26);
      const inset = Math.round(rnd() * 34);
      const w = width - inset - Math.round(rnd() * 24);
      y -= h;
      const c = rnd();
      const band = 14 + Math.round(rnd() * 14);
      const doubleRule = rnd() < 0.4;
      const m = rnd();
      const titleLength = 0.35 + rnd() * 0.45;
      spines.push({
        x: left + inset,
        y,
        w,
        h: h - 3,
        cover: c < 0.35 ? "solid" : c < 0.55 ? "tint" : "outline",
        band,
        doubleRule,
        mark:
          m < 0.55
            ? { kind: "title", length: titleLength }
            : m < 0.75
              ? { kind: "rings" }
              : m < 0.88
                ? { kind: "label" }
                : { kind: "dot" },
      });
    }
  }
  return spines;
})();

const COVER = { solid: FILL, tint: TINT, outline: LINE } as const;

function Book({ s }: { s: Spine }) {
  const mid = s.y + s.h / 2;
  const left = s.x + s.band + 18;
  const right = s.x + s.w - s.band - 18;
  const { mark } = s;
  return (
    <>
      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={3} {...COVER[s.cover]} />
      <line x1={s.x + s.band} y1={s.y} x2={s.x + s.band} y2={s.y + s.h} {...LINE} strokeOpacity={0.45} />
      <line x1={s.x + s.w - s.band} y1={s.y} x2={s.x + s.w - s.band} y2={s.y + s.h} {...LINE} strokeOpacity={0.45} />
      {s.doubleRule && <line x1={s.x + s.band + 6} y1={s.y} x2={s.x + s.band + 6} y2={s.y + s.h} {...FAINT} />}

      {mark.kind === "title" && (
        <>
          <line
            x1={left}
            y1={mid}
            x2={left + (right - left) * mark.length}
            y2={mid}
            stroke="currentColor"
            strokeOpacity={0.55}
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {s.h > 33 && <line x1={left} y1={mid + 8} x2={left + (right - left) * mark.length * 0.5} y2={mid + 8} {...FAINT} strokeOpacity={0.4} />}
        </>
      )}
      {mark.kind === "rings" &&
        Array.from({ length: Math.max(0, Math.floor((right - left - 10) / 22)) }, (_, i) => (
          <circle key={i} cx={left + 10 + i * 22} cy={mid} r={Math.min(9, (s.h - 7) / 2)} {...FAINT} strokeOpacity={0.35} />
        ))}
      {mark.kind === "label" && (
        <rect x={(left + right) / 2 - 26} y={s.y + 5} width={52} height={s.h - 10} rx={2} {...LINE} strokeOpacity={0.5} />
      )}
      {mark.kind === "dot" && <circle className="text-cta" cx={(left + right) / 2} cy={mid} r={5} {...ACCENT_FILL} />}
    </>
  );
}

/**
 * General Knowledge: the whole card a wall of old books stacked spines-out — bands at each end,
 * titles, ornaments, the odd gilt dot. It covers the card, title included, so the panel draws it
 * fainter than the other drawings (`quiet` in `CategoryArt`).
 */
export function GeneralKnowledgeArt() {
  return SPINES.map((s) => <Book key={`${s.x},${s.y}`} s={s} />);
}
