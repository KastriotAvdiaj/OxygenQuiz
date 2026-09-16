import { useMemo, type CSSProperties } from "react";
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
import { parseQuizPalette, quizEdgeColor, readableTextColor } from "./quiz-palette";
import { LiftedButton } from "@/common/LiftedButton";

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
  // The dialog's depth layer. Set as a custom property rather than a class because the
  // colour is a runtime value — Tailwind's JIT only emits classes it can read in source.
  const edgeColor = useMemo(() => quizEdgeColor(primaryColor), [primaryColor]);

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
      {/* Borrows the ModeCard silhouette — 2px border, 2xl radius, a flat `0 4px 0`
          edge — so the modal reads as part of the same family as the mode cards. The
          depth is the only thing borrowed: a card is a control and lifts under the
          cursor, a dialog is a surface and stays put, so there is no hover transform
          here.

          The edge is the quiz's own colour rather than a theme token, which is what
          ties the dialog to the card that opened it.

          max-h + inner scroll: long titles/descriptions must not push the CTA
          off small screens — the body scrolls instead (85dvh tracks the visible
          mobile viewport; svh fallback n/a, vh fallback below). */}
      <DialogContent
        className="sm:max-w-sm mx-auto rounded-2xl border-2 border-border dark:border-2 dark:border-border bg-card font-quiz p-0 overflow-hidden gap-0 shadow-[0_4px_0_0_var(--edge)] max-h-[85vh] supports-[height:1dvh]:max-h-[85dvh] flex flex-col"
        style={{ "--edge": edgeColor } as CSSProperties}
      >
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

          {/* Action row. Centred and content-width rather than full-bleed: this is the
              one thing to do here, and a button stretched edge to edge reads as a form
              footer.

              `liftColor` is the face colour, so LiftedButton derives its edge and shadow
              from the category instead of falling back to the theme blue — the same
              relationship the dialog's own `--edge` has to the same colour.

              The face is painted through `--face` / `--face-text` rather than a plain
              `style` backgroundColor because LiftedButton's `style` lands on the *outer*
              element and the coloured face is an inner span. Custom properties inherit
              down to it, and `bg-[var(…)]` is a real Tailwind class, so tailwind-merge
              drops the component's own `bg-primary` / `text-white` instead of leaving two
              background rules to fight over source order. */}
          <div className="flex justify-center pt-1">
            <LiftedButton
              type="button"
              onClick={handleStartQuiz}
              liftColor={primaryColor}
              className="h-10 gap-2 px-6 text-sm sm:text-base font-bold font-quiz tracking-wider bg-[var(--face)] text-[color:var(--face-text)]"
              style={
                {
                  "--face": primaryColor,
                  "--face-text": ctaTextColor,
                } as CSSProperties
              }
            >
              <Play className="h-4 w-4 fill-current" />
              Start Quiz
            </LiftedButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
