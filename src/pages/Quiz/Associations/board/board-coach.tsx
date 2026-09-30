import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { CoachStep } from "./board-model";

/** Space between the bubble and what it points at — room for the arrow to curve. */
const GAP = 44;
const BUBBLE_MAX_WIDTH = 240;

type Box = { left: number; top: number; width: number; height: number };

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
 * The first-play guide over the board (docs/quiz/associations.md §9.10): a ring around one
 * element, a note beside it, and a curved arrow from the note to it. It draws only — which step
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
  const [layout, setLayout] = useState<{ target: Box; container: Box } | null>(null);
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
      const inner = element.getBoundingClientRect();
      setLayout({
        container: { left: 0, top: 0, width: outer.width, height: outer.height },
        target: { left: inner.left - outer.left, top: inner.top - outer.top, width: inner.width, height: inner.height },
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [selector]);

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" aria-live="polite">
      {layout && <CoachLayer layout={layout} step={step} selector={selector} onDismiss={onDismiss} />}
    </div>
  );
};

const CoachLayer = ({
  layout: { target, container },
  step,
  selector,
  onDismiss,
}: {
  layout: { target: Box; container: Box };
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

  // The arrow: from the note's edge nearest the target to the target's edge, bowed through the
  // corner between them.
  const start = { x: toRight ? left + 28 : left + width - 28, y: top };
  const end = {
    x: target.left + target.width * (toRight ? 0.55 : 0.45),
    y: below ? target.top + target.height + 6 : target.top - 6,
  };
  const control = { x: start.x, y: end.y };
  const copy = COPY[step.kind];

  return (
    <>
      <div
        aria-hidden
        className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background motion-safe:animate-pulse"
        // A measured position is a style, not a class (CLAUDE.md: class strings stay literal).
        style={{ left: target.left, top: target.top, width: target.width, height: target.height }}
      />

      <svg aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker id="board-coach-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-primary" />
          </marker>
        </defs>
        <motion.path
          key={selector}
          d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
          fill="none"
          className="stroke-primary"
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
          className="pointer-events-auto absolute rounded-lg border border-primary/40 bg-popover p-3 text-sm text-popover-foreground shadow-lg"
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
