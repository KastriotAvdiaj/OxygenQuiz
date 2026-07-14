import { useCallback, useMemo } from "react";
import { HelpCircle, Clock, ArrowRight } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { cn } from "@/utils/cn";

interface QuizCardProps {
  quiz: QuizSummaryDTO;
  onClick?: (quiz: QuizSummaryDTO) => void;
}

export function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes > 0 ? minutes + "m " : ""}${remainingSeconds}s`;
}

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

  const primaryColor = colors[0];

  const handleClick = useCallback(() => {
    onClick?.(quiz);
  }, [onClick, quiz]);

  const questionLabel = quiz.questionCount === 1 ? "question" : "questions";

  return (
    // h-full: the picker grid stretches rows (auto-rows-fr), so every card in
    // a row renders the same height regardless of its content length.
    <div
      className="group h-full w-full cursor-pointer"
      onClick={handleClick}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
        )}
      >
        {/* Colored identity rail — the quiz's primary palette color is the only
            thing distinguishing one quiz from another, kept deliberate and small. */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="flex flex-1 flex-col p-4 pl-5 sm:p-5 sm:pl-6">
          {/* Category */}
          <p
            className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: primaryColor }}
          >
            {quiz.category}
          </p>

          {/* Title */}
          <h3 className="font-quiz text-base font-semibold leading-snug text-foreground line-clamp-2">
            {quiz.title}
          </h3>

          {/* Description */}
          {quiz.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {quiz.description}
            </p>
          )}

          {/* Spacer — absorbs the leftover height in stretched cards so the
              meta row + footer stay pinned to the bottom edge */}
          <div className="min-h-4 flex-1" aria-hidden />

          {/* Meta info row */}
          <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              {quiz.questionCount} {questionLabel}
            </span>

            {quiz.timeLimitInSeconds > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {secondsToMinutes(quiz.timeLimitInSeconds)}
              </span>
            )}

            <span className="ml-auto capitalize">{quiz.difficulty}</span>
          </div>

          {/* Footer — author + hover Play affordance */}
          <div className="mt-3 flex items-center justify-between">
            <span className="truncate text-xs text-muted-foreground">
              by {quiz.user}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                "-translate-x-1 opacity-0 transition-all duration-200",
                "group-hover:translate-x-0 group-hover:opacity-100"
              )}
              style={{ color: primaryColor }}
            >
              Play <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
