import { forwardRef, useMemo, useRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { ReportButton } from "@/features/reports/components/report-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Play, Presentation, Link2, Flag } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { canHost as hasHostRole } from "@/lib/authorization";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { secondsToMinutes } from "./quiz-duration";
import { parseQuizPalette, quizEdgeColor, readableTextColor } from "./quiz-palette";
import { LiftedButton } from "@/common/LiftedButton";
import { useCopyQuizLink } from "@/pages/Dashboard/Pages/Quiz/api/use-copy-quiz-link";

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

  // Teachers and SuperAdmins may host a board for a class (docs/quiz/classroom.md, C16).
  const navigate = useNavigate();
  const { data: user } = useUser();
  const canHost = quiz.format === "Associations" && hasHostRole(user?.roles);
  // Public only: its link is the quiz listing (docs/quiz/quiz-listing.md). The modal also opens for
  // an Unlisted quiz reached through a share link, whose only link is the one already in hand.
  const canCopyLink = quiz.status === "Public";
  const quizLink = useCopyQuizLink();

  // The dialog focuses its first focusable element on open — now the copy-link icon, which then
  // shows a focus ring and its tooltip. Start Quiz is what this dialog is for, so it gets focus:
  // Enter starts the quiz.
  const startRef = useRef<HTMLButtonElement>(null);

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
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          startRef.current?.focus();
        }}
      >
        {/* Sized up (sm:max-w-lg, roomier padding, bigger title) since 2026-09-24: the cards no
            longer show the description, so this is where a quiz is read before it is played. */}
        {/* Copy link and Report, as icons beside the close button (2026-10-27). As buttons they
            sat next to Start Quiz at nearly its weight; up here they're there when wanted and
            Start is the one thing to press. Tooltips say what each does; aria-labels say it to a
            screen reader. Placed to line up with the dialog's own ✕ (right-4 top-4, 16px). */}
        <TooltipProvider>
          <div className="absolute right-10 top-2 z-10 flex items-center gap-1">
            {canCopyLink && (
              <CardAction label="Copy link" onClick={() => quizLink.copy(quiz)} disabled={quizLink.isPending}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
              </CardAction>
            )}
            {/* Wrong information, an inappropriate image, spam — docs/media/moderation.md. */}
            <ReportButton
              quizId={quiz.id}
              trigger={(open) => (
                <CardAction label="Report this quiz" onClick={open} className="hover:text-red-600">
                  <Flag className="h-4 w-4" aria-hidden="true" />
                </CardAction>
              )}
            />
          </div>
        </TooltipProvider>

        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto">
          <DialogHeader className="space-y-3">
            {/* pr-24 keeps the badges clear of the icons and ✕ in the corner. */}
            <div className="flex items-center gap-2 flex-wrap pr-24">
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
            {/* The two numbers are the point, so they're big and nothing sits beside them: the
                icon tiles that used to (a ? and a clock) only repeated the labels (2026-10-27). */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                {/* A board has no questions — "0" here would be a wrong answer, not a missing one. */}
                {quiz.format === "Associations" ? (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Format</p>
                    <p className="text-lg sm:text-xl font-bold leading-tight text-foreground">Associations board</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Questions</p>
                    <p className="text-2xl sm:text-3xl font-bold leading-tight text-foreground tabular-nums">{quiz.questionCount}</p>
                  </>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Time Limit</p>
                <p className="text-2xl sm:text-3xl font-bold leading-tight text-foreground tabular-nums">
                  {quiz.timeLimitInSeconds > 0 ? secondsToMinutes(quiz.timeLimitInSeconds) : "None"}
                </p>
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

          {/* Action row. Start Quiz is the home page's Play button (hero-actions.tsx): a square
              face inside a frame of its own edge, sized for a dialog — the same button for the
              same act, so playing looks the same wherever you start it (2026-10-27).

              `liftColor` is the face colour, so LiftedButton derives its edge and shadow
              from the category instead of falling back to the theme blue — the same
              relationship the dialog's own `--edge` has to the same colour.

              The face is painted through `--face` / `--face-text` rather than a plain
              `style` backgroundColor because LiftedButton's `style` lands on the *outer*
              element and the coloured face is an inner span. Custom properties inherit
              down to it, and `bg-[var(…)]` is a real Tailwind class, so tailwind-merge
              drops the component's own `bg-primary` / `text-white` instead of leaving two
              background rules to fight over source order. */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <LiftedButton
              ref={startRef}
              type="button"
              onClick={handleStartQuiz}
              liftColor={primaryColor}
              outerClassName="rounded-none p-1"
              className="gap-2 rounded-none px-8 py-2.5 text-lg sm:px-10 sm:text-xl font-bold font-quiz tracking-wider bg-[var(--face)] text-[color:var(--face-text)]"
              style={
                {
                  "--face": primaryColor,
                  "--face-text": ctaTextColor,
                } as CSSProperties
              }
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" aria-hidden="true" />
              Start Quiz
            </LiftedButton>
            {canHost && (
              // Secondary action beside the CTA: the same square frame a size down, muted so
              // Start Quiz stays the one coloured button (CLAUDE.md, "User-facing buttons").
              <LiftedButton
                type="button"
                outerClassName="rounded-none p-1"
                className="gap-2 rounded-none px-4 py-2.5 bg-muted text-foreground"
                liftColor="muted-foreground"
                onClick={() => {
                  onClose();
                  navigate(`/my-dashboard/host?quizId=${quiz.id}`);
                }}
              >
                <Presentation className="h-4 w-4" aria-hidden="true" /> Host for a class
              </LiftedButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A quiet icon button in the card's corner, with a tooltip naming it. Forwards its ref and props
 * because Radix's `TooltipTrigger asChild` hands it both.
 */
const CardAction = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button"> & { label: string }>(
  ({ label, className, children, ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      {/* Below and end-aligned: above, it opened past the card's top edge; centred, past its right. */}
      <TooltipContent side="bottom" align="end">{label}</TooltipContent>
    </Tooltip>
  ),
);
CardAction.displayName = "CardAction";
