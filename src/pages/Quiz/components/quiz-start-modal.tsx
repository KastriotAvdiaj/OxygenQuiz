import { useMemo, type CSSProperties } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Clock, User, Calendar, Play, Presentation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";
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

  // Teachers may host a board for a class (docs/quiz/classroom.md, C16).
  const navigate = useNavigate();
  const { data: user } = useUser();
  const canHost = quiz.format === "Associations" && (user?.roles?.includes(ROLES.Teacher) ?? false);

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
        className="sm:max-w-lg mx-auto rounded-2xl border-2 border-border dark:border-2 dark:border-border bg-card font-quiz p-0 overflow-hidden gap-0 shadow-[0_4px_0_0_var(--edge)] max-h-[85vh] supports-[height:1dvh]:max-h-[85dvh] flex flex-col"
        style={{ "--edge": edgeColor } as CSSProperties}
      >
        {/* Sized up (sm:max-w-lg, roomier padding, bigger title) since 2026-09-24: the cards no
            longer show the description, so this is where a quiz is read before it is played. */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto">
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

            <DialogTitle className="text-xl sm:text-3xl font-bold leading-tight text-left pr-6 text-foreground tracking-wider">
              {quiz.title}
            </DialogTitle>

            {quiz.description && (
              <DialogDescription className="font-app text-sm sm:text-base text-muted-foreground text-left leading-relaxed">
                {quiz.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Stats grid */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 text-sm sm:text-base">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
                <div>
                  {/* A board has no questions — "0" here would be a wrong answer, not a missing one. */}
                  {quiz.format === "Associations" ? (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Format</p>
                      <p className="font-bold text-foreground">Associations board</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Questions</p>
                      <p className="font-bold text-foreground">{quiz.questionCount}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-sm sm:text-base">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Clock className="h-4 w-4" style={{ color: primaryColor }} />
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
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
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
              className="h-11 gap-2 px-8 text-base sm:text-lg font-bold font-quiz tracking-wider bg-[var(--face)] text-[color:var(--face-text)]"
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
            {canHost && (
              <Button
                type="button"
                variant="outline"
                className="ml-3 h-11 gap-2"
                onClick={() => {
                  onClose();
                  navigate(`/my-dashboard/host?quizId=${quiz.id}`);
                }}
              >
                <Presentation className="h-4 w-4" /> Host for a class
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
