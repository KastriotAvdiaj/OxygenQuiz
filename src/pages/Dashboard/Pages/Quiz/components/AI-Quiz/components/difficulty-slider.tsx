import { cn } from "@/utils/cn";

export interface DifficultyLevel {
  id: number;
  label: string;
}

export interface DifficultySliderProps {
  /** The instance's ratings, easiest first. Fewer than two and there is nothing to slide between. */
  levels: DifficultyLevel[];
  valueId: number | null;
  onChange: (id: number) => void;
}

/**
 * How hard the quiz should be: a slider with one stop per difficulty level, easiest on the left.
 *
 * The stops are the instance's own difficulty rows — the same names the builder's select shows —
 * so this can never ask for a level that doesn't exist, however an admin has named or numbered
 * them. What it sets is the level the model writes the questions for *and* the quiz's own rating,
 * which is why the two can no longer disagree (docs/adr/0047-the-wizard-asks-how-hard.md).
 *
 * <b>A real range input, drawn over.</b> The `<input type="range">` is there and takes every
 * pointer and key event — arrows, Home/End, drag, touch — but is transparent; the track, fill and
 * thumb under it are ours, so they follow the theme instead of each browser's own slider. Its
 * width and position are runtime values, so they are inline styles (a class can't be built from
 * a number). The level names under the track are a mouse shortcut to the same value and are
 * hidden from assistive technology, which already has the slider.
 */
export const DifficultySlider = ({ levels, valueId, onChange }: DifficultySliderProps) => {
  if (levels.length < 2) return null;
  const index = Math.max(0, levels.findIndex((level) => level.id === valueId));
  const fraction = index / (levels.length - 1);
  // The thumb is 1.5rem wide, so its centre travels between 0.75rem from each edge.
  const along = `calc(0.75rem + (100% - 1.5rem) * ${fraction})`;

  return (
    <div className="mt-3">
      <div className="relative h-8">
        <input
          id="ai-difficulty"
          type="range"
          min={0}
          max={levels.length - 1}
          step={1}
          value={index}
          onChange={(event) => onChange(levels[Number(event.target.value)].id)}
          aria-valuetext={levels[index].label}
          aria-describedby="ai-difficulty-hint"
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute inset-x-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted-foreground/20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `calc((100% - 1.5rem) * ${fraction})` }}
          aria-hidden="true"
        />
        {levels.map((level, i) => (
          <span
            key={level.id}
            className={cn(
              "pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-200",
              i <= index ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background",
            )}
            style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${i / (levels.length - 1)})` }}
            aria-hidden="true"
          />
        ))}
        <div
          className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-md transition-[left,transform] duration-200 motion-reduce:transition-none peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30 peer-active:scale-110"
          style={{ left: along }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1 flex justify-between" aria-hidden="true">
        {levels.map((level, i) => (
          <button
            key={level.id}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(level.id)}
            className={cn(
              "min-w-0 truncate px-1 text-xs transition-colors duration-200",
              i === index ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {level.label}
          </button>
        ))}
      </div>
      <p id="ai-difficulty-hint" className="mt-2 text-xs text-muted-foreground">
        The questions are written for this level, and the quiz is rated with it.
      </p>
    </div>
  );
};
