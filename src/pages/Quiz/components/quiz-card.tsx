import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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

  // const gradientStyle = useMemo(() => {
  //   if (quiz.gradient && colors.length > 1) {
  //     return `linear-gradient(135deg, ${colors.join(", ")})`;
  //   }
  //   return primaryColor;
  // }, [colors, quiz.gradient, primaryColor]);

  const handleClick = useCallback(() => {
    onClick?.(quiz);
  }, [onClick, quiz]);

  return (
    <div
      className="relative group w-full max-w-sm mx-auto cursor-pointer"
      onClick={handleClick}
    >
      {/* Lifted shadow — uses quiz primary color for a branded feel */}
      <div
        className="absolute top-1.5 left-1.5 w-full h-full rounded-xl opacity-50 transition-all duration-200 group-hover:top-2 group-hover:left-2"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Main card body */}
      <div
        className={cn(
          "relative bg-card shadow-md rounded-xl overflow-hidden",
          "transition-transform duration-200 ease-out",
          "group-hover:-translate-y-0.5 group-hover:-translate-x-0.5"
        )}
      >
        {/* Top accent gradient strip */}
        <div
          className="h-2 w-full"
          // style={{ background: gradientStyle }}
        />

        {/* Card content */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Category badge */}
          <Badge
            variant="secondary"
            className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border tracking-wider uppercase"
            style={{
              backgroundColor: `${primaryColor}15`,
              borderColor: `${primaryColor}40`,
              color: primaryColor,
            }}
          >
            {quiz.category}
          </Badge>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold font-quiz tracking-wider leading-snug text-foreground line-clamp-2">
            {quiz.title}
          </h3>

          {/* Meta info row */}
          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              <span className="font-medium">{quiz.questionCount}q</span>
            </div>

            {quiz.timeLimitInSeconds > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                <span className="font-medium">
                  {secondsToMinutes(quiz.timeLimitInSeconds)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 ml-auto">
              <span className="font-medium text-muted-foreground/70">
                {quiz.difficulty}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full opacity-20"
            style={{ backgroundColor: primaryColor }}
          />

          {/* Footer — author + arrow */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[60%]">
              by {quiz.user}
            </span>
            <div
              className="flex items-center gap-1 text-xs font-bold font-quiz tracking-wider transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: primaryColor }}
            >
              <span>PLAY</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
