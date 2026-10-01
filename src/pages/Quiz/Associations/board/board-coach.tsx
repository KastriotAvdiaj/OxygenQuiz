import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { CoachStep } from "./board-model";

/** Space between the bubble and what it points at — room for the arrow to curve. */
/** How far the sharp window reaches past what it shows — enough to keep the ring and lift in. */
const SPOT_PAD = 6;
/**
 * How far the blur runs past the board on every side (matches `-inset-3`; no more than the page's px-4, or a phone would scroll sideways), fading out over the
 * same distance, so it has no hard edge of its own.
 */
const BLUR_BLEED = 12;
/** Fades the blur layer out towards all four edges: two gradients, intersected. */
const EDGE_FADE = `linear-gradient(to right, transparent, black ${BLUR_BLEED}px, black calc(100% - ${BLUR_BLEED}px), transparent), linear-gradient(to bottom, transparent, black ${BLUR_BLEED}px, black calc(100% - ${BLUR_BLEED}px), transparent)`;
const GAP = 44;
const BUBBLE_MAX_WIDTH = 240;

type Box = { left: number; top: number; width: number; height: number };
/** `target` is what the ring goes round; `spot` is what stays sharp — the target, or its whole Column. */
type Layout = { target: Box; spot: Box; container: Box };

const COPY: Record<NonNullable<CoachStep>["kind"], { text: string; action: string }> = {
  tile: {
    text: "Start here — open a tile. Every tile you open earns you one guess.",
    action: "Skip",
  },
  guess: {
    text: "Type what links this column's tiles here and press Enter — or open another tile for another clue.",
    action: "Got it",
  },
};

/**
 * The first-play guide over the board (docs/quiz/associations.md §9.10): the rest of the board
 * dimmed and blurred, a ring around one element, a note beside it, and a curved arrow from the
 * note to it. It draws only — which step
 * to show is `coachStep`, from the view — and it is placed by measuring the board, the one
 * reason it has an Effect: the element it points at is wherever layout put it.
 *
 * Rendered inside the board's `relative` wrapper, which it covers (`inset-0`) and measures
 * itself against — its own element, not a ref handed down: a parent's ref isn't attached yet
 * when a child's layout effect first runs. Transparent to clicks except for its button, so the
 * Tile it points at is clicked straight through the ring.
 */
export const BoardCoach = ({
  step,
  onDismiss,
}: {
  step: NonNullable<CoachStep>;
  onDismiss: () => void;
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const selector =
    step.kind === "tile" ? `[data-coach-tile="${step.tileId}"]` : `[data-coach-target="${step.target}"]`;

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const container = overlay?.parentElement;
    if (!overlay || !container) return;
    const measure = () => {
      const element = container.querySelector(selector);
      if (!element) return setLayout(null);
      const outer = overlay.getBoundingClientRect();
      const relative = (el: Element): Box => {
        const r = el.getBoundingClientRect();
        return { left: r.left - outer.left, top: r.top - outer.top, width: r.width, height: r.height };
      };
      // Guessing a Column: its Tiles stay sharp too — the opened one is the clue being guessed from.
      const spotElement = step.kind === "guess" ? (element.closest("section") ?? element) : element;
      setLayout({
        container: { left: 0, top: 0, width: outer.width, height: outer.height },
        target: relative(element),
        spot: relative(spotElement),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [selector, step.kind]);

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" aria-live="polite">
      {layout && <CoachLayer layout={layout} step={step} selector={selector} onDismiss={onDismiss} />}
    </div>
  );
};

const CoachLayer = ({
  layout: { target, spot, container },
  step,
  selector,
  onDismiss,
}: {
  layout: Layout;
  step: NonNullable<CoachStep>;
  selector: string;
  onDismiss: () => void;
}) => {

  // In the next Column over, towards the roomier side; below the target in the top half of the
  // board, above it in the bottom half — so the note covers closed Tiles, not the Column being
  // guessed. On a phone there is no room beside, and it is clamped over the edge instead.
  const width = Math.min(BUBBLE_MAX_WIDTH, container.width - 16);
  const toRight = target.left + target.width / 2 < container.width / 2;
  const below = target.top + target.height / 2 < container.height / 2;
  const left = toRight
    ? Math.min(target.left + target.width + 12, container.width - width)
    : Math.max(target.left - 12 - width, 0);
  const top = below ? target.top + target.height + GAP : target.top - GAP;

  // The arrow: from the note's edge nearest the target to the middle of the target's side facing
  // the note (its right side when the note is to the right), bowed through the corner between them.
  const start = { x: toRight ? left + 28 : left + width - 28, y: top };
  const end = {
    x: toRight ? target.left + target.width + 8 : target.left - 8,
    y: target.top + target.height / 2,
  };
  const control = { x: start.x, y: end.y };
  const copy = COPY[step.kind];

  // The rest of the board is dimmed and blurred: one layer with a window cut out of it — the outer
  // rectangle clockwise, the window counter-clockwise, so nonzero filling leaves it empty. Clicks
  // still pass through (the overlay is pointer-events-none): the guide points, it doesn't block.
  // In the blur layer's own coordinates, which start BLUR_BLEED outside the board.
  const x1 = spot.left - SPOT_PAD + BLUR_BLEED;
  const y1 = spot.top - SPOT_PAD + BLUR_BLEED;
  const x2 = spot.left + spot.width + SPOT_PAD + BLUR_BLEED;
  const y2 = spot.top + spot.height + SPOT_PAD + BLUR_BLEED;
  const clipPath = `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px)`;

  return (
    <>
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="absolute -inset-3 bg-background/50 backdrop-blur-[3px]"
        // A measured shape is a style, not a class (CLAUDE.md: class strings stay literal).
        style={{
          clipPath,
          maskImage: EDGE_FADE,
          maskComposite: "intersect",
          WebkitMaskImage: EDGE_FADE,
          WebkitMaskComposite: "source-in",
        }}
      />

      <div
        aria-hidden
        className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background motion-safe:animate-pulse"
        // A measured position is a style, not a class (CLAUDE.md: class strings stay literal).
        style={{ left: target.left, top: target.top, width: target.width, height: target.height }}
      />

      <svg aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker id="board-coach-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-primary dark:fill-foreground" />
          </marker>
        </defs>
        <motion.path
          key={selector}
          d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
          fill="none"
          // Primary on light; on dark the primary line got lost against the blue Tiles.
          className="stroke-primary dark:stroke-foreground"
          strokeWidth={2}
          strokeLinecap="round"
          markerEnd="url(#board-coach-arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        />
      </svg>

      <AnimatePresence mode="wait">
        <motion.div
          key={selector}
          role="note"
          initial={{ opacity: 0, y: below ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto absolute rounded-lg border border-foreground bg-popover p-3 text-sm text-popover-foreground shadow-lg"
          style={{ left, top, width, translate: below ? undefined : "0 -100%" }}
        >
          <p>{copy.text}</p>
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onDismiss}>
              {copy.action}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
