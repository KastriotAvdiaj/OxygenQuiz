import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

type TabStripProps = {
  /** The heading over the box: "Matches", "Players". */
  label: string;
  /** What the choice is, for a screen reader: "Which match to review". */
  ariaLabel: string;
  /** The tabs: `role="tab"` buttons. Each should be `shrink-0`. */
  children: React.ReactNode;
  className?: string;
};

/**
 * A labelled box holding one row of tabs that scrolls sideways when it runs out of room
 * (docs/quiz/multiplayer.md §7.6).
 *
 * The match review has two of these, "Matches" over "Players". A lobby can hold many of either —
 * an evening of rematches, a full room — and a row that wraps turns into a block of buttons with
 * no order to it. So the row stays one line: it scrolls, and when there is more in a direction an
 * arrow appears at that end which moves the row along by one tab. The arrows are absent when
 * everything fits, so the ordinary two-player lobby shows no controls it doesn't need.
 *
 * The scrollbar itself is hidden; touch and trackpad still scroll the row directly.
 */
export function TabStrip({ label, ariaLabel, children, className }: TabStripProps) {
  const row = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  // What is out of view is a fact about the DOM — the row's width against its content — so it
  // is measured: on scroll, and whenever the row or its content changes size.
  useEffect(() => {
    const node = row.current;
    if (!node) return;
    const measure = () => {
      const left = node.scrollLeft > 1;
      const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      setMore((was) => (was.left === left && was.right === right ? was : { left, right }));
    };
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    Array.from(node.children).forEach((child) => observer.observe(child));
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [children]);

  /** Move the row so the next (or previous) tab sits at its left edge. */
  const step = (direction: 1 | -1) => {
    const node = row.current;
    if (!node) return;
    const tabs = Array.from(node.children) as HTMLElement[];
    const starts = tabs.map((tab) => tab.offsetLeft - node.offsetLeft);
    const target =
      direction === 1
        ? starts.find((start) => start > node.scrollLeft + 1)
        : [...starts].reverse().find((start) => start < node.scrollLeft - 1);
    if (target === undefined) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({ left: target, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <section className={cn("mb-3", className)}>
      <h3
        className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </h3>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-2 dark:border-foreground/20">
        <StripArrow direction={-1} visible={more.left} onClick={() => step(-1)} label={label} />
        <div
          ref={row}
          role="tablist"
          aria-label={ariaLabel}
          // min-w-0: a flex child won't shrink below its content without it, and then nothing
          // overflows and nothing scrolls (docs/RESPONSIVE.md).
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
        <StripArrow direction={1} visible={more.right} onClick={() => step(1)} label={label} />
      </div>
    </section>
  );
}

/**
 * One end's arrow. It keeps its place in the layout while hidden — fading rather than
 * unmounting — so the row doesn't jump sideways each time an arrow comes or goes.
 */
const StripArrow = ({
  direction,
  visible,
  onClick,
  label,
}: {
  direction: 1 | -1;
  visible: boolean;
  onClick: () => void;
  label: string;
}) => {
  const Icon = direction === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      aria-hidden={!visible}
      aria-label={direction === 1 ? `More ${label.toLowerCase()}` : `Earlier ${label.toLowerCase()}`}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-[opacity,width,margin,border-color] duration-200 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Hidden: no width either, so a row that fits uses the whole box.
        !visible && "pointer-events-none w-0 border-0 opacity-0",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
};
