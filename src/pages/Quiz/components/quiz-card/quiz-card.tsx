import { useCallback, useMemo } from "react";
import { ArrowRight } from "lucide-react";
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
 * Built like the mode cards on /choose-mode (`mode-card.tsx`) so the two pages read as one app
 * (2026-09-24): a display title, a foot row ending in an arrow, and the pushable 3D edge
 * (`card-parts.tsx`). No description — the start dialog shows it. Where a mode card has a fixed
 * accent, this one uses the quiz's own — derived from its category palette, never hardcoded
 * (`quiz-palette.ts`) — for the edge, the category label, the difficulty meter and the arrow.
 *
 * <b>The format is told by shape, not by an icon</b> (2026-10-06). The two formats used to share
 * an accent-filled icon chip — a list or a grid in the same coloured square — which didn't tell
 * them apart at a glance. Now a Classic card opens on the *whole* palette as a dot row (however
 * many colours the category has — see `useDots`), and a board opens on a miniature of the board
 * itself (`BoardGlyph`): four columns of four tiles and the Final under them, plus its "Board"
 * label.
 *
 * The title carries the personality: `font-quiz` (DynaPuff by default, user-swappable via
 * `--font-quiz`) at display size, the same face the quiz itself is played in, so the card
 * previews the thing it opens. Everything else stays in `font-app` so the metadata reads
 * as metadata.
 *
 * Details that are easy to undo by accident:
 *  - The frame is a `<button>` (see `card-parts.tsx`), so the card is keyboard-reachable
 *    and gets a real focus ring. The arrow is therefore decorative, never a nested `<button>`.
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
  const { colors, accent, onAccent, initials, sizeLabel, duration, difficultyRank } =
    useQuizCardModel(quiz);
  const dots = useDots(colors);
  const isBoard = quiz.format === "Associations";

  const handleSelect = useCallback(() => {
    onClick?.(quiz);
  }, [onClick, quiz]);

  return (
    <QuizCardFrame quiz={quiz} accent={accent} onAccent={onAccent} onSelect={handleSelect}>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex shrink-0 items-center gap-3">
          {isBoard ? (
            <BoardGlyph accent={accent} />
          ) : (
            /* aria-hidden: decorative. The category name below already carries the meaning
               the colour is standing in for. */
            <span aria-hidden="true" className="flex items-center gap-1.5">
              {dots.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          )}

          {/* Top-right corner: who made it — initials or their photo, the full name on hover —
              with a board's "Board" label beside it. */}
          <span className="ml-auto flex items-center gap-2">
            {isBoard && <BoardMark accent={accent} />}
            <CreatorAvatar
              name={quiz.user}
              imageUrl={quiz.userProfileImageUrl}
              initials={initials}
            />
          </span>
        </div>

        <h3 className="mt-3 font-quiz text-xl sm:mt-4 sm:text-[1.6rem] font-bold leading-[1.12] tracking-wide text-foreground line-clamp-2">
          {quiz.title}
        </h3>

        {/* The one place the accent appears as text. It sits on the card surface rather
            than on a fill, so it needs no contrast flip — but very pale categories can
            go faint here, which is the trade-off this design makes for its calm. */}
        <span
          className="mt-2 min-w-0 truncate text-[11px] font-bold uppercase tracking-widest"
          style={{ color: accent }}
        >
          {quiz.category}
        </span>

        {/* The breathing room the design is built around. Without a minimum the footer
            rides up under a one-line title and the card loses its poster proportions;
            `mt-auto` below then takes over on rows stretched taller by a sibling. Smaller on
            phones: one card per row there, and a poster-tall card showed three to a screen. */}
        <div aria-hidden="true" className="min-h-[1.25rem] flex-1 sm:min-h-[3.25rem]" />

        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {sizeLabel.count !== null && (
              <>
                <span className="font-bold text-foreground">
                  {sizeLabel.count}
                </span>{" "}
              </>
            )}
            {sizeLabel.label}
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

          {/* Decorative: the whole card is the button. The mode cards' bare arrow, travelling
              on hover — "this opens something". */}
          <ArrowRight
            aria-hidden="true"
            className="ml-auto h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1.5"
            style={{ color: accent }}
          />
        </div>
      </div>
    </QuizCardFrame>
  );
}

/**
 * A board in miniature: four columns of four tiles, and the Final as a bar across the bottom —
 * the shape of the game the card opens, so a board reads as a different kind of thing from a
 * Classic quiz before anyone reads a word. Tiles are a tint of the accent and the Final is solid,
 * the way the game builds up to it. Tilts on hover, like the chip it replaced.
 *
 * Decorative (`aria-hidden`): the frame's `aria-label` already says "Associations board".
 */
function BoardGlyph({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 flex-col gap-[3px] transition-transform duration-200 group-hover:-rotate-6"
    >
      <span className="grid grid-cols-4 gap-[3px]">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-[1.5px] sm:h-[7px] sm:w-[7px]"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 40%, transparent)` }}
          />
        ))}
      </span>
      <span className="h-[5px] w-full rounded-[1.5px]" style={{ backgroundColor: accent }} />
    </span>
  );
}

/**
 * Says "Board" on an Associations card, beside its `BoardGlyph`; the size line ("Associations
 * board") says the same in words (card-model.ts).
 */
function BoardMark({ accent }: { accent: string }) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`, color: accent }}
    >
      Board
    </span>
  );
}
