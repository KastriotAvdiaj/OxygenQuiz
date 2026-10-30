import { EditPencil } from "@/components/icons/edit-pencil";
import { QuestionMedia } from "@/common/QuestionMedia";
import { AnimatePresence, motion, type MotionValue } from "framer-motion";
import type { KeyboardEvent, PointerEvent } from "react";
import { AlertTriangle, Check, Eye, EyeOff, GripVertical, Lightbulb, Trash2 } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";

import {
  getQuestionTypeTheme,
  questionErrorTheme,
} from "../../question-type-theme";
import type { QuizQuestion } from "../../types";
import { toQuestionReview, type ReviewAnswer } from "./review-model";
import type { MasonrySlot } from "./use-masonry";

/** The expand used for everything that opens inside a card — explanation, typed answer, errors. */
const expand = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
} as const;

export interface QuestionReviewCardProps {
  question: QuizQuestion;
  /** 1-based position, as the player will meet it. */
  number: number;
  /** Whether the correct answer is showing — per card, or all of them via "Show answers". */
  revealed: boolean;
  /** Absent while "Show answers" is on: there is nothing per card to toggle. */
  onToggleReveal?: () => void;
  onEdit: () => void;
  /** Removes it — the overview offers Undo for a few seconds after. */
  onRemove: () => void;
  /** The submit found something wrong with this question. */
  hasErrors: boolean;
  /** From `useDragReorder`: the item's ref, the grip's handlers, and the drag state. */
  itemRef: (el: HTMLElement | null) => void;
  handleProps: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  };
  /** Held (shown picked up). */
  isDragging: boolean;
  /** Placed by hand: held, or settling after the drop. Its `x`/`y` are then `dragX`/`dragY`. */
  isPositioned: boolean;
  /** How far the held card sits from its layout slot — it follows the pointer. */
  dragX: MotionValue<number>;
  dragY: MotionValue<number>;
  /** Wide screens: where the masonry places this card (use-masonry.ts). Absent, it flows. */
  slot?: MasonrySlot;
}

/**
 * One question in the quiz overview, read the way a player meets it: the whole question, every
 * option, and the answer kept back until asked for (docs/quiz/quiz-overview.md).
 *
 * Choices (multiple choice, true/false) are always listed — they are part of the question.
 * Only *which* is correct waits for Reveal. A typed answer has nothing to list, so the answer
 * itself is what Reveal shows.
 *
 * Dragged by the grip only (`useDragReorder`), so on a phone a swipe anywhere else still
 * scrolls the page. `touch-none` on the grip is what lets a finger drag it without the browser
 * taking the gesture for a scroll.
 */
export const QuestionReviewCard = ({
  question,
  number,
  revealed,
  onToggleReveal,
  onEdit,
  onRemove,
  hasErrors,
  itemRef,
  handleProps,
  isDragging,
  isPositioned,
  dragX,
  dragY,
  slot,
}: QuestionReviewCardProps) => {
  const review = toQuestionReview(question);
  const theme = getQuestionTypeTheme(question.type);

  return (
    <motion.li
      ref={itemRef}
      // The others slide into their new slots (`layout`). The card placed by hand opts out:
      // `dragY` already puts it under the pointer, and framer's layout animation — even at
      // duration 0 — added a FLIP transform for one frame on every reorder, holding the card
      // at its old slot: the glitch on each swap (use-drag-reorder.ts).
      layout={isPositioned ? false : "position"}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        // y comes from `dragY` while the card is placed by hand; otherwise it rests at 0.
        ...(isPositioned ? {} : { y: 0 }),
        scale: isDragging ? 1.02 : 1,
        // Lifted while dragging, so the card reads as picked up rather than sliding under others.
        boxShadow: isDragging
          ? "0 12px 28px -12px rgb(0 0 0 / 0.35)"
          : "0 0 0 0 rgb(0 0 0 / 0)",
      }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      data-masonry-id={question.id}
      style={{
        ...(slot && {
          position: "absolute",
          left: slot.left,
          top: slot.top,
          width: slot.width,
        }),
        x: isPositioned ? dragX : undefined,
        y: isPositioned ? dragY : undefined,
        zIndex: isPositioned ? 20 : undefined,
      }}
      className="relative list-none rounded-lg"
    >
      <article
        aria-label={`Question ${number}`}
        className={cn(
          // The dashboard card (CLAUDE.md, "Inside a dashboard"), framed in the question type's
          // colour with a bar of it across the top (question-type-theme.ts, `overview*`). A
          // question that failed the submit is framed in red instead — error overrides type.
          "overflow-hidden rounded-lg border-2 bg-card transition-colors duration-200",
          hasErrors ? questionErrorTheme.overviewFrame : theme.overviewFrame,
        )}
      >
        <header
          className={cn(
            // Compact from `xl`, where the cards are columns of a masonry: smaller padding, text
            // and buttons, so four fit across where one used to (docs/quiz/quiz-overview.md).
            "flex items-center gap-2 px-3 py-2 text-foreground transition-colors duration-200 sm:px-4 xl:gap-1.5 xl:px-2.5 xl:py-1.5",
            hasErrors ? questionErrorTheme.overviewBar : theme.overviewBar,
          )}
        >
          <button
            type="button"
            aria-label={`Drag to reorder question ${number}`}
            title="Drag, or use the arrow keys, to move"
            {...handleProps}
            className="-ml-1 flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md hover:bg-background/30 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold tabular-nums xl:text-xs">
            {number}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold xl:text-xs">
            {theme.label}
          </span>
          {/* Icon-only lifted buttons: the bar's two actions, quiet beside the content. */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LiftedButton
              type="button"
              variant="icon"
              aria-label={`Edit question ${number}`}
              title="Edit"
              onClick={onEdit}
              className="xl:p-1.5"
            >
              <EditPencil className="h-4 w-4 xl:h-3.5 xl:w-3.5" />
            </LiftedButton>
            <LiftedButton
              type="button"
              variant="icon"
              aria-label={`Remove question ${number}`}
              title="Remove"
              onClick={onRemove}
              liftColor="red-700"
              className="bg-red-600 text-white xl:p-1.5"
            >
              <Trash2 className="h-4 w-4 xl:h-3.5 xl:w-3.5" />
            </LiftedButton>
          </div>
        </header>

        <div className="p-4 sm:p-5 xl:p-3">
          <AnimatePresence initial={false}>
            {hasErrors && (
              <motion.p key="errors" {...expand} className="overflow-hidden">
                <span className="mb-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  This question needs fixing before the quiz can be saved — edit
                  it.
                </span>
              </motion.p>
            )}
          </AnimatePresence>

          <p className="whitespace-pre-wrap break-words text-base font-medium leading-snug text-foreground xl:text-sm">
            {review.text.trim() || (
              <span className="italic text-muted-foreground">
                No question text yet
              </span>
            )}
          </p>

          {review.mediaUrl && (
            <QuestionMedia mediaUrl={review.mediaUrl} mediaType={review.mediaType} credit={review.mediaCredit} alt="" className="mt-3" />
          )}

          <div className="mt-4 xl:mt-3">
            <AnswerView answer={review.answer} revealed={revealed} />
          </div>

          <AnimatePresence initial={false}>
            {revealed && review.explanation && (
              <motion.div
                key="explanation"
                {...expand}
                className="overflow-hidden"
              >
                <p className="mt-4 flex gap-2 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground xl:mt-3 xl:p-2 xl:text-xs">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="whitespace-pre-wrap break-words">
                    {review.explanation}
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {onToggleReveal && (
            <button
              type="button"
              onClick={onToggleReveal}
              aria-pressed={revealed}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline xl:mt-2 xl:h-7 xl:text-xs"
            >
              {revealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {revealed ? "Hide answer" : "Reveal answer"}
            </button>
          )}
        </div>
      </article>
    </motion.li>
  );
};

const AnswerView = ({
  answer,
  revealed,
}: {
  answer: ReviewAnswer;
  revealed: boolean;
}) => {
  if (answer.kind === "options") {
    return (
      <div>
        {answer.multiSelect && (
          <p className="mb-2 text-xs text-muted-foreground">
            More than one answer is correct
          </p>
        )}
        {/* Two columns of options from `sm`, back to one at `xl`, where the card itself is one
            column of a masonry and two options side by side would wrap every label. */}
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 xl:gap-1.5">
          {answer.options.map((option, i) => {
            const correct = revealed && option.isCorrect;
            const wrong = revealed && !option.isCorrect;
            return (
              <li
                key={i}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-md border px-3 py-2 text-sm xl:min-h-8 xl:gap-2 xl:px-2.5 xl:py-1.5 xl:text-xs",
                  "transition-[background-color,border-color,color,opacity] duration-200 motion-reduce:transition-none",
                  correct
                    ? "border-quiz-success/60 bg-quiz-success/10 text-foreground"
                    : "border-border text-foreground",
                  wrong && "opacity-60",
                )}
              >
                {/* The marker turns into a tick on reveal; same size either way, so nothing shifts. */}
                <span
                  aria-hidden
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 xl:h-4 xl:w-4 transition-colors duration-200 motion-reduce:transition-none",
                    correct
                      ? "border-quiz-success bg-quiz-success text-white"
                      : "border-muted-foreground/40",
                  )}
                >
                  <AnimatePresence initial={false}>
                    {correct && (
                      <motion.span
                        key="tick"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="min-w-0 break-words">
                  {option.text.trim() || (
                    <span className="italic text-muted-foreground">
                      Empty option
                    </span>
                  )}
                </span>
                {correct && <span className="sr-only">(correct answer)</span>}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Typed answer: nothing to list, so the answer itself is what stays hidden.
  return (
    <AnimatePresence mode="wait" initial={false}>
      {revealed ? (
        <motion.div
          key="answer"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="space-y-2"
        >
          <div className="flex min-h-11 items-center gap-2.5 rounded-md border border-quiz-success/60 bg-quiz-success/10 px-3 py-2 text-sm xl:min-h-8 xl:gap-2 xl:px-2.5 xl:py-1.5 xl:text-xs">
            <span
              aria-hidden
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-quiz-success text-white"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="min-w-0 break-words font-medium">
              {answer.correct.trim() || (
                <span className="italic text-muted-foreground">
                  No answer yet
                </span>
              )}
            </span>
          </div>
          {answer.alsoAccepted.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Also accepted: {answer.alsoAccepted.join(", ")}
            </p>
          )}
          {(answer.caseSensitive || answer.partialMatch) && (
            <p className="text-xs text-muted-foreground">
              {[
                answer.caseSensitive && "Case-sensitive",
                answer.partialMatch && "Partial match allowed",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex min-h-11 items-center rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground xl:min-h-8 xl:px-2.5 xl:py-1.5 xl:text-xs"
        >
          The player types the answer
        </motion.div>
      )}
    </AnimatePresence>
  );
};
