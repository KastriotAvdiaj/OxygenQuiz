import { cn } from "@/utils/cn";

/** -1 | 0 | 1 on each axis: 27 cubies, grouped into three Y slices. */
const AXIS = [-1, 0, 1] as const;
type Coord = (typeof AXIS)[number];
type Position = { x: Coord; y: Coord; z: Coord };

/**
 * One entry per side: the class that orients the face, its sticker colour, and the
 * test for whether this cubie is on that side of the cube.
 *
 * The class names are written out in full on purpose. Tailwind purges `@layer
 * components` rules whose class it cannot read verbatim in the source, so a
 * `rubiks-face-${side}` template compiles fine and then renders a flat pile of
 * squares with every face transform missing — the interpolation trap in CLAUDE.md,
 * Styling, in its least obvious form.
 */
const FACES: {
  className: string;
  sticker: string;
  isOuter: (at: Position) => boolean;
}[] = [
  {
    className: "rubiks-face rubiks-face-u",
    sticker: "#f8f8f2",
    isOuter: (at) => at.y === -1,
  },
  {
    className: "rubiks-face rubiks-face-d",
    sticker: "#f5c518",
    isOuter: (at) => at.y === 1,
  },
  {
    className: "rubiks-face rubiks-face-f",
    sticker: "#2fa84f",
    isOuter: (at) => at.z === 1,
  },
  {
    className: "rubiks-face rubiks-face-b",
    sticker: "#2a63d6",
    isOuter: (at) => at.z === -1,
  },
  {
    className: "rubiks-face rubiks-face-r",
    sticker: "#d1372f",
    isOuter: (at) => at.x === 1,
  },
  {
    className: "rubiks-face rubiks-face-l",
    sticker: "#e8791f",
    isOuter: (at) => at.x === -1,
  },
];

export interface RubiksCubeProps {
  /**
   * Edge of one cubie in px. The cube ends up a little over 3x this.
   * Deliberately not a Tailwind size — the CSS derives every other measurement
   * from it (see `.rubiks` in global.css).
   */
  cubieSize?: number;
  /**
   * Freeze it. Users who ask for reduced motion get this from CSS without any
   * caller doing anything; the prop is for stories and snapshots, where a cube
   * that never stops turning is a flaky diff rather than a nice touch.
   */
  still?: boolean;
  className?: string;
}

/**
 * A Rubik's cube turning itself over, in CSS.
 *
 * <b>Why it exists.</b> AI generation is the one wait in the app long enough to need
 * more than a spinner — 10-40 seconds, no streaming, so the client waits blind
 * (docs/quiz/ai-quiz-generation-flow.md, known issue 12). `GeneratingOverlay` is what
 * fills that wait; this is the thing to look at while it lasts.
 *
 * <b>Why it isn't `LoadingWave`.</b> Every ordinary wait in the app is LoadingWave, and
 * that is on purpose — a wait should not announce itself as a different thing each time
 * (quiz-loading-view.tsx). This is the exception the split-flap board already
 * established: a moment that wants a set-piece. Keep the exception to one.
 *
 * <b>Why CSS and not three.js.</b> `three` is in package.json but nothing imports it, so
 * it is not in the bundle today; pulling it in costs ~79KB gzipped before any React
 * bindings, fetched at the exact moment the user is already waiting on a slow call. A
 * cube is six coloured squares per cubie and one rotation — a 3D engine buys nothing
 * that `preserve-3d` doesn't already give.
 *
 * Purely decorative: `aria-hidden`. The overlay owns the announcement.
 */
export const RubiksCube = ({
  cubieSize = 30,
  still = false,
  className,
}: RubiksCubeProps) => (
  <div
    aria-hidden
    className={cn("rubiks", still && "rubiks-still", className)}
    style={{ "--cubie": `${cubieSize}px` } as React.CSSProperties}
  >
    <div className="rubiks-cube">
      {AXIS.map((y, index) => (
        <div
          key={y}
          className="rubiks-layer"
          // Negative delays start each slice partway through the cycle, so the
          // three never turn together.
          style={{ "--layer-delay": `${index * -4}s` } as React.CSSProperties}
        >
          {AXIS.map((x) =>
            AXIS.map((z) => <Cubie key={`${x}-${z}`} x={x} y={y} z={z} />)
          )}
        </div>
      ))}
    </div>
  </div>
);

/**
 * One cubie. A face is only stickered when it is on the outside of the cube —
 * `--sticker` unset falls back to plastic in CSS — which is what makes a turning
 * layer show its insides the way a real cube does.
 */
const Cubie = (at: Position) => (
  <div
    className="rubiks-cubie"
    style={
      { "--x": at.x, "--y": at.y, "--z": at.z } as React.CSSProperties
    }
  >
    {FACES.map((face) => (
      <span
        key={face.className}
        className={face.className}
        style={
          face.isOuter(at)
            ? ({ "--sticker": face.sticker } as React.CSSProperties)
            : undefined
        }
      />
    ))}
  </div>
);
