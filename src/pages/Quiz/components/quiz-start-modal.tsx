import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Clock, User, Calendar, Play } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { secondsToMinutes } from "./quiz-duration";
import { parseQuizPalette, readableTextColor } from "./quiz-palette";

// Single-player only — multiplayer hosting starts inside the lobby, never from
// this modal (the old mode="multiplayer" branch was unreachable).
interface QuizStartModalProps {
  quiz: QuizSummaryDTO;
  isOpen: boolean;
  onClose: () => void;
  onStartQuiz: (quizId: number) => void;
}

export function QuizStartModal({
  quiz,
  isOpen,
  onClose,
  onStartQuiz,
}: QuizStartModalProps) {
  const colors = useMemo(
    () => parseQuizPalette(quiz.colorPaletteJson),
    [quiz.colorPaletteJson]
  );

  const primaryColor = colors[0];
  const ctaTextColor = useMemo(
    () => readableTextColor(primaryColor),
    [primaryColor]
  );

  const handleStartQuiz = () => {
    onStartQuiz(quiz.id);
    onClose();
  };

  const formatDate = (date: string | Date) => {
    if (!date) return "Unknown";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* max-h + inner scroll: long titles/descriptions must not push the CTA
          off small screens — the body scrolls instead (85dvh tracks the visible
          mobile viewport; svh fallback n/a, vh fallback below). */}
      <DialogContent className="sm:max-w-sm mx-auto border-border bg-card font-quiz p-0 overflow-hidden gap-0 max-h-[85vh] supports-[height:1dvh]:max-h-[85dvh] flex flex-col">
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <DialogHeader className="space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
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
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border tracking-wider uppercase"
              >
                {quiz.difficulty}
              </Badge>
            </div>

            <DialogTitle className="text-lg sm:text-xl font-bold leading-tight text-left pr-6 text-foreground tracking-wider">
              {quiz.title}
            </DialogTitle>

            {quiz.description && (
              <DialogDescription className="text-sm text-muted-foreground text-left leading-relaxed">
                {quiz.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Stats grid */}
          <div className="rounded-lg border border-border p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <HelpCircle className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Questions</p>
                  <p className="font-bold text-foreground">{quiz.questionCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Clock className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Time Limit</p>
                  <p className="font-bold text-foreground">
                    {quiz.timeLimitInSeconds > 0 ? secondsToMinutes(quiz.timeLimitInSeconds) : "None"}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-border/50" />

            {/* Author & Date */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {quiz.user && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" style={{ color: primaryColor }} />
                  <span className="font-medium">{quiz.user}</span>
                </div>
              )}
              {quiz.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" style={{ color: primaryColor }} />
                  <span className="font-medium">{formatDate(quiz.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action button — flat, category-tinted, with auto-contrast label so
              it stays readable and consistent across every palette. */}
          <button
            type="button"
            onClick={handleStartQuiz}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm sm:text-base font-bold font-quiz tracking-wider transition-all duration-200 hover:brightness-95 active:scale-[0.99]"
            style={{ backgroundColor: primaryColor, color: ctaTextColor }}
          >
            <Play className="h-4 w-4 fill-current" />
            Start Quiz
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
