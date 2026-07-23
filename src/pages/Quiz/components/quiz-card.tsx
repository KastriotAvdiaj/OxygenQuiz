import { useCallback, useMemo, type CSSProperties } from "react";
import { HelpCircle, Clock, ArrowRight } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { cn } from "@/utils/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuizCardProps {
  quiz: QuizSummaryDTO;
  onClick?: (quiz: QuizSummaryDTO) => void;
}

export function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes > 0 ? minutes + "m " : ""}${remainingSeconds}s`;
}

/**
 * A single quiz in the picker grid. Premium interactive card:
 *  - the quiz's palette colour drives a pill "category badge" + the hover glow,
 *    exposed to CSS as the `--accent` custom property so hover states can use it
 *    without inline JS (Tailwind can't interpolate a runtime hex into a hover:
 *    class).
 *  - fully fluid: `h-full w-full`, no fixed pixel widths — the parent grid
 *    (grid-cols-1 → 2xl:grid-cols-4) decides how many sit per row.
 *  - clean sans body text (`font-app`); the playful display font is reserved
 *    for the app's hero headings.
 */
export function QuizCard({ quiz, onClick }: QuizCardProps) {
  const colors = useMemo(() => {
    try {
      return quiz.colorPaletteJson
        ? (JSON.parse(quiz.colorPaletteJson) as string[])
        : ["#6366f1", "#3b82f6", "#06b6d4"];
    } catch {
      return ["#6366f1", "#3b82f6", "#06b6d4"];
    }
  }, [quiz.colorPaletteJson]);

  const accent = colors[0];

  const handleClick = useCallback(() => {
    onClick?.(quiz);
  }, [onClick, quiz]);

  const questionLabel = quiz.questionCount === 1 ? "question" : "questions";

  // Expose the per-quiz accent to CSS so hover glow/border can reference it via
  // arbitrary Tailwind values (`hover:shadow-[...var(--accent)]`).
  const accentVars = { "--accent": accent } as CSSProperties;

  return (
    // h-full: the picker grid stretches rows (auto-rows-fr), so every card in a
    // row renders the same height regardless of its content length.
    <div
      className="group h-full w-full cursor-pointer font-app"
      style={accentVars}
      onClick={handleClick}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:border-[var(--accent)]",
          "hover:shadow-[0_10px_30px_-10px_var(--accent)]"
        )}
      >
        {/* Top accent hairline — a whisper of the palette colour along the top
            edge, brightening on hover. */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{ backgroundColor: accent }}
        />

        {/* p-5 flex column, contents pinned top & bottom (justify-between). */}
        <div className="flex h-full flex-col justify-between p-5">
          {/* Top: category badge (left) + author (right) */}
          <div className="flex items-start justify-between gap-3">
            <span
              className="w-fit rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                color: accent,
                backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
              }}
            >
              {quiz.category}
            </span>
            {/* Creator avatar — reveals their name on hover. */}
            <div className="group/author relative shrink-0">
              <Avatar className="h-7 w-7 border border-border">
                <AvatarImage
                  src={quiz.userProfileImageUrl}
                  alt={quiz.user}
                  loading="lazy"
                  decoding="async"
                />
                <AvatarFallback className="bg-muted text-[11px] font-semibold text-muted-foreground">
                  {quiz.user?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-200 group-hover/author:opacity-100">
                {quiz.user}
              </span>
            </div>
          </div>

          {/* Middle: crisp, bold title. The fuller description lives in the start
              modal — keeping the card to title + badge makes the grid scan cleanly
              and keeps card heights uniform. */}
          <div className="mt-3 flex-1">
            <h3 className="text-lg font-bold tracking-wide text-foreground line-clamp-2">
              {quiz.title}
            </h3>
          </div>

          {/* Bottom: compact icon-led stats over a hairline divider. Icons carry
              the meaning (count / time) so the labels stay out — tighter and
              cleaner for a small card. The "Play" affordance slides in on hover. */}
          <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <span
              className="flex items-center gap-1 tabular-nums"
              title={`${quiz.questionCount} ${questionLabel}`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {quiz.questionCount}
            </span>

            {quiz.timeLimitInSeconds > 0 && (
              <span
                className="flex items-center gap-1 tabular-nums"
                title="Time limit"
              >
                <Clock className="h-3.5 w-3.5" />
                {secondsToMinutes(quiz.timeLimitInSeconds)}
              </span>
            )}

            <span
              className={cn(
                "ml-auto flex items-center gap-1 font-semibold",
                "translate-x-1 opacity-0 transition-all duration-300",
                "group-hover:translate-x-0 group-hover:opacity-100"
              )}
              style={{ color: accent }}
            >
              Play <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
