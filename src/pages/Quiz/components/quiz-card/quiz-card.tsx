import { useCallback, useMemo } from "react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { CreatorAvatar, DifficultyMeter, QuizCardFrame } from "./card-parts";
import { useQuizCardModel } from "./card-model";

interface QuizCardProps {
  quiz: QuizSummaryDTO;
  onClick?: (quiz: QuizSummaryDTO) => void;
}

/**
 * A single quiz in the picker grid.
 *
 * Editorial and restrained: the card stays on the neutral surface and the quiz's colour is
 * spent on a stripe across the top, the category label and the difficulty meter. The colours
 * are the quiz's own — derived from its category palette, never hardcoded (`quiz-palette.ts`)
 * — and this is the one place the *whole* palette is shown rather than just its first colour.
 *
 * Details that are easy to undo by accident:
 *  - The stripe is the only element with no radius of its own; `overflow-hidden` + `rounded-xl`
 *    on the frame clips it, which keeps one radius token in one place.
 *  - The frame is a `<button>` (see `card-parts.tsx`), so the card is keyboard-reachable and
 *    gets a real focus ring. It was a bare `div` with `onClick` before.
 *  - Fully fluid (`h-full w-full`, no fixed widths) — the parent grid decides the columns and
 *    `auto-rows-fr` there keeps every card in a row the same height, which is why the stats
 *    row is pinned with `mt-auto` rather than sitting directly under the title.
 */

/**
 * Build the stripe segments. Categories with a rich palette show it as-is; a category with
 * only one or two colours would otherwise render as a flat bar, so we pad it out with tints
 * and shades of the accent to keep the stripe legible as a stripe.
 */
function useStripe(colors: string[]): string[] {
  return useMemo(() => {
    if (colors.length >= 4) return colors.slice(0, 6);

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
  const { colors, accent, initials, questionLabel, duration, difficultyRank } =
    useQuizCardModel(quiz);
  const stripe = useStripe(colors);

  const handleSelect = useCallback(() => {
    onClick?.(quiz);
  }, [onClick, quiz]);

  return (
    <QuizCardFrame quiz={quiz} accent={accent} onSelect={handleSelect}>
      {/* aria-hidden: decorative. The category name right below already carries the
          meaning the colour is standing in for. */}
      <div aria-hidden="true" className="flex h-1.5 w-full shrink-0">
        {stripe.map((color, index) => (
          <span
            key={`${color}-${index}`}
            className="h-full flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2.5">
          {/* The one place the accent appears as text. It sits on the card surface rather
              than on a fill, so it needs no contrast flip — but very pale categories can
              go faint here, which is the trade-off this design makes for its calm. */}
          <span
            className="min-w-0 truncate text-[11px] font-bold uppercase tracking-widest"
            style={{ color: accent }}
          >
            {quiz.category}
          </span>
          <CreatorAvatar
            name={quiz.user}
            imageUrl={quiz.userProfileImageUrl}
            initials={initials}
          />
        </div>

        <h3 className="mt-1.5 text-lg font-bold leading-tight tracking-tight text-foreground line-clamp-2">
          {quiz.title}
        </h3>

        {/* mt-auto pins the stats to the bottom so they line up across a stretched row. */}
        <div className="mt-auto flex items-center gap-3 border-t border-border pt-2.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <span className="text-foreground">{quiz.questionCount}</span>{" "}
            {questionLabel}
          </span>

          {duration && (
            <span className="tabular-nums" title="Time limit">
              {duration}
            </span>
          )}

          <span className="ml-auto shrink-0">
            <DifficultyMeter
              difficulty={quiz.difficulty}
              rank={difficultyRank}
              accent={accent}
            />
          </span>
        </div>
      </div>
    </QuizCardFrame>
  );
}
