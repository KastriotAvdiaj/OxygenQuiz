import { useCallback, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { DifficultyMeter, QuizCardFrame } from "./card-parts";
import { useQuizCardModel } from "./card-model";

interface QuizCardProps {
  quiz: QuizSummaryDTO;
  onClick?: (quiz: QuizSummaryDTO) => void;
}

/**
 * A single quiz in the picker grid.
 *
 * Playful but still quiet: the card stays on the neutral surface and the quiz's colour is
 * spent on the palette dots, the category label, the difficulty meter and the play
 * affordance. The colours are the quiz's own — derived from its category palette, never
 * hardcoded (`quiz-palette.ts`) — and this is the one place the *whole* palette is shown
 * rather than just its first colour, which is why the dot row is however many colours the
 * category has and not a fixed four (see `useDots`).
 *
 * The title carries the personality: `font-quiz` (DynaPuff by default, user-swappable via
 * `--font-quiz`) at display size, the same face the quiz itself is played in, so the card
 * previews the thing it opens. Everything else stays in `font-app` so the metadata reads
 * as metadata.
 *
 * Details that are easy to undo by accident:
 *  - The dots are inset, not a flush stripe. They sit inside the body padding so the card's
 *    only edge treatment is its border — which is what makes the big radius read as round
 *    rather than as a clipped bar.
 *  - The radius is an explicit value, not `rounded-xl`. The theme's `--radius` is 0.3rem,
 *    tuned for dense dashboard chrome; this card is a poster and wants a much rounder
 *    corner. It is deliberately the one place that opts out.
 *  - The frame is a `<button>` (see `card-parts.tsx`), so the card is keyboard-reachable
 *    and gets a real focus ring. The arrow is therefore a decorative `<span>`, never a
 *    nested `<button>`.
 *  - Fully fluid (`h-full w-full`, no fixed widths) — the parent grid decides the columns
 *    and `auto-rows-fr` there keeps every card in a row the same height, which is why the
 *    stats row is pinned with `mt-auto` rather than sitting under the title.
 */

/**
 * Build the palette dots.
 *
 * A palette is 2–5 colours (docs/entities/category-palettes.md) and a category with a full
 * one shows all of them — this is the one place the *whole* palette is visible rather than
 * just its dominant colour, so truncating it to a fixed four would quietly make two
 * five-colour categories look identical. The cap is 5 because that is the real maximum, not
 * because the row is four dots wide.
 *
 * Short palettes are the other half: two colours render as two dots, which reads as a
 * mistake rather than as a palette, so they are padded to four with tints and shades of the
 * accent. Padding up, never trimming down.
 */
function useDots(colors: string[]): string[] {
  return useMemo(() => {
    if (colors.length >= 4) return colors.slice(0, 5);

    const accent = colors[0];
    const derived = [
      accent,
      `color-mix(in srgb, ${accent} 65%, white)`,
      colors[1] ?? `color-mix(in srgb, ${accent} 35%, white)`,
      `color-mix(in srgb, ${accent} 75%, black)`,
    ];
    return [...colors, ...derived].slice(0, 4);
  }, [colors]);
}

export function QuizCard({ quiz, onClick }: QuizCardProps) {
  const { colors, accent, questionLabel, duration, difficultyRank } =
    useQuizCardModel(quiz);
  const dots = useDots(colors);

  const handleSelect = useCallback(() => {
    onClick?.(quiz);
  }, [onClick, quiz]);

  return (
    <QuizCardFrame quiz={quiz} accent={accent} onSelect={handleSelect}>
      <div className="flex flex-1 flex-col p-5">
        {/* aria-hidden: decorative. The category name below already carries the meaning
            the colour is standing in for. */}
        <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
          {dots.map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="h-[7px] w-[7px] rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <h3 className="mt-4 font-quiz text-[1.7rem] font-bold leading-[1.12] text-foreground line-clamp-2">
          {quiz.title}
        </h3>

        {/* The one place the accent appears as text. It sits on the card surface rather
            than on a fill, so it needs no contrast flip — but very pale categories can
            go faint here, which is the trade-off this design makes for its calm. */}
        <span
          className="mt-2.5 min-w-0 truncate text-[11px] font-bold uppercase tracking-widest"
          style={{ color: accent }}
        >
          {quiz.category}
        </span>

        {/* The breathing room the design is built around. Without a minimum the footer
            rides up under a one-line title and the card loses its poster proportions;
            `mt-auto` below then takes over on rows stretched taller by a sibling. */}
        <div aria-hidden="true" className="min-h-[3.25rem] flex-1" />

        <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <span className="font-bold text-foreground">
              {quiz.questionCount}
            </span>{" "}
            {questionLabel}
          </span>

          {duration && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums" title="Time limit">
                {duration}
              </span>
            </>
          )}

          <span className="shrink-0 pl-0.5">
            <DifficultyMeter
              difficulty={quiz.difficulty}
              rank={difficultyRank}
              accent={accent}
            />
          </span>

          {/* Decorative: the whole card is the button, so this must not be focusable and
              must not announce itself. It exists to say "this opens something". */}
          <span
            aria-hidden="true"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ease-out"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
              color: accent,
            }}
          >
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </QuizCardFrame>
  );
}
