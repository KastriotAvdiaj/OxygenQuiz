import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Clock, User, Calendar, Play, Users } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { secondsToMinutes } from "./quiz-card";
import { LiftedButton } from "@/common/LiftedButton";

interface QuizStartModalProps {
  quiz: QuizSummaryDTO;
  isOpen: boolean;
  onClose: () => void;
  onStartQuiz: (quizId: number) => void;
  mode?: string;
}

export function QuizStartModal({
  quiz,
  isOpen,
  onClose,
  onStartQuiz,
  mode = "single",
}: QuizStartModalProps) {
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

  const gradientStyle = useMemo(() => {
    if (quiz.gradient && colors.length > 1) {
      return `linear-gradient(135deg, ${colors.join(", ")})`;
    }
    return primaryColor;
  }, [colors, quiz.gradient, primaryColor]);

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
      <DialogContent className="sm:max-w-md mx-auto  border-foreground bg-card font-quiz p-0 overflow-hidden gap-0">
        {/* Top gradient accent strip */}
        <div
          className="h-2.5 w-full"
          style={{ background: gradientStyle }}
        />

        <div className="p-5 sm:p-6 space-y-5">
          <DialogHeader className="space-y-3">
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

            <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight text-left pr-6 text-foreground tracking-wider">
              {quiz.title}
            </DialogTitle>

            {quiz.description && (
              <DialogDescription className="text-sm text-muted-foreground text-left leading-relaxed">
                {quiz.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Stats grid */}
          <div
            className="rounded-lg border-2 p-3 sm:p-4 space-y-3"
            style={{ borderColor: `${primaryColor}30` }}
          >
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

          <div className="w-full">
          {/* Action button */}
          <LiftedButton
            onClick={handleStartQuiz}
            outerClassName="w-full"
            className="h-12 w-full text-base font-bold font-quiz tracking-wider border-[2px] border-foreground text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              backgroundColor: primaryColor,
            }}
          >
            {mode === "multiplayer" ? (
              <>
                <Users className="h-4 w-4 mr-2" />
                Create Lobby
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2 fill-current" />
                Start Quiz
              </>
            )}
          </LiftedButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
