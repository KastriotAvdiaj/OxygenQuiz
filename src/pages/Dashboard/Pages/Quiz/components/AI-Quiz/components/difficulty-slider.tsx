import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils/cn";
import { difficultyTone } from "../../difficulty-theme";

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
 * How hard the quiz should be: a stepped meter with one bar per difficulty level, rising from
 * the easiest on the left — read at a glance as "how far up", like signal bars.
 *
 * The stops are the instance's own difficulty rows — the same names the builder's select shows —
 * so this can never ask for a level that doesn't exist, however an admin has named or numbered
 * them. What it sets is the level the model writes the questions for *and* the quiz's own rating,
 * which is why the two can no longer disagree (docs/adr/0047-the-wizard-asks-how-hard.md). That
 * sentence is the ⓘ beside the field's label (`advanced-options.tsx`), not text under it.
 *
 * <b>A real range input, drawn over.</b> The `<input type="range">` lies over the bars and takes
 * every pointer and key event — arrows, Home/End, drag, a tap on a bar — but is transparent; the
 * bars are ours, so they follow the theme instead of each browser's own slider. Each bar has its
 * level's tone from the heat ramp (`difficultyTone`: blue at the easy end, red at the hard end):
 * the chosen level solid and standing on its darker edge, the ones below it faint, the ones above
 * empty. Bar heights and the column count are runtime values, so they are inline styles (a class
 * can't be built from a number).
 *
 * <b>Motion.</b> The chosen bar springs up a few pixels, overshooting a little, and colours
 * cross-fade; each bar's fade waits by its distance from the chosen one, so the heat runs along
 * the meter instead of switching at once. Reduced motion: the colours change, nothing travels
 * (docs/development/motion.md, "arrive, don't travel"). The names under the bars are a mouse shortcut to the same value
 * and are hidden from assistive technology, which already has the slider.
 */
export const DifficultySlider = ({ levels, valueId, onChange }: DifficultySliderProps) => {
  const reduceMotion = useReducedMotion();
  if (levels.length < 2) return null;
  const index = Math.max(0, levels.findIndex((level) => level.id === valueId));
  const columns = { gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` };
  // The shortest bar is a third of the tallest, so even the first step reads as a bar.
  const heightOf = (i: number) => `${35 + (65 * i) / (levels.length - 1)}%`;
  const chosenTone = difficultyTone(index, levels.length);

  return (
    <div className="mt-3">
      <div className="relative">
        <input
          id="ai-difficulty"
          type="range"
          min={0}
          max={levels.length - 1}
          step={1}
          value={index}
          onChange={(event) => onChange(levels[Number(event.target.value)].id)}
          aria-valuetext={levels[index].label}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="grid h-11 items-end gap-1.5 rounded-lg px-0.5 pb-1 pt-1.5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
          style={columns}
          aria-hidden="true"
        >
          {levels.map((level, i) => {
            const tone = difficultyTone(i, levels.length);
            return (
              <motion.span
                key={level.id}
                className={cn(
                  "rounded-md transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none",
                  i === index ? tone.chosen : i < index ? tone.passed : "bg-muted-foreground/15",
                )}
                style={{ height: heightOf(i), transitionDelay: `${Math.abs(i - index) * 40}ms` }}
                initial={false}
                animate={{ y: i === index && !reduceMotion ? -3 : 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 18, mass: 0.6 }
                }
              />
            );
          })}
        </div>
      </div>
      <div className="mt-1 grid gap-1.5" style={columns} aria-hidden="true">
        {levels.map((level, i) => (
          <button
            key={level.id}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(level.id)}
            className={cn(
              "min-w-0 truncate text-center text-xs transition-colors duration-200",
              i === index
                ? cn("font-semibold", chosenTone.text)
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
};
