/**
 * How a difficulty level is coloured: a heat ramp from the app's own blue at the easy end to
 * red at the hard end (docs/quiz/question-type-color-schema.md, "Difficulty").
 *
 * <b>By position, not by name.</b> The levels are the instance's own rows, easiest first, and an
 * admin can rename or add them — so a level's colour comes from where it sits in that list, not
 * from whether it is called "Expert". Four tones cover any count: the easiest is always `primary`
 * and the hardest always red, with amber and orange between.
 *
 * <b>Red, knowingly.</b> Red is also the builder's error colour. Here it sits on a meter whose
 * other stops are amber and orange, so it reads as "hottest", not "wrong" — but don't use these
 * tones somewhere a red could be mistaken for a validation error.
 *
 * Complete literal class strings, so the Tailwind JIT can see them. The lift under a chosen tone
 * is that hue's darker shade, the edge a `LiftedButton` stands on.
 */
export interface DifficultyTone {
  /** The chosen level: solid, standing on its darker edge. */
  chosen: string;
  /** A level below the chosen one: the same hue, faint — the heat the meter has climbed through. */
  passed: string;
  /** The chosen level's name. */
  text: string;
}

const TONES: DifficultyTone[] = [
  {
    chosen: "bg-primary shadow-[0_3px_0_0_color-mix(in_srgb,hsl(var(--primary)),black_35%)]",
    passed: "bg-primary/40",
    text: "text-primary",
  },
  {
    chosen: "bg-amber-500 shadow-[0_3px_0_0_var(--color-amber-700)]",
    passed: "bg-amber-500/40",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    chosen: "bg-orange-600 shadow-[0_3px_0_0_var(--color-orange-800)]",
    passed: "bg-orange-600/40",
    text: "text-orange-600 dark:text-orange-400",
  },
  {
    chosen: "bg-red-600 shadow-[0_3px_0_0_var(--color-red-800)]",
    passed: "bg-red-600/40",
    text: "text-red-600 dark:text-red-400",
  },
];

/** The tone of the level at `index` among `count` levels, easiest first. */
export const difficultyTone = (index: number, count: number): DifficultyTone =>
  count < 2 ? TONES[0] : TONES[Math.round((index * (TONES.length - 1)) / (count - 1))];
