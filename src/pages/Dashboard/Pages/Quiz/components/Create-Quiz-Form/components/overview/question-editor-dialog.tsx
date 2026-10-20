import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { AnyQuestion } from "@/types/question-types";

import { useQuiz } from "../../Quiz-questions-context";
import type { NewAnyQuestion, QuizQuestion } from "../../types";
import { ExistingQuestionCard } from "../existing-display-quiz-question-card/main-display-quiz-question-export";
import { NewQuestionCard } from "../new-display-quiz-question-card/main-display-quiz-question-card";
import { QuestionSettingsCard } from "../quiz-question-settings";

export interface QuestionEditorDialogProps {
  /** The question being edited, or null when the dialog is closed. */
  questionId: number | null;
  onQuestionChange: (id: number | null) => void;
  /** Removes a question — the overview's, so a removal here gets the same Undo. */
  onRemove: (id: number) => void;
}

/**
 * Edit one question, over the overview (docs/adr/0026-the-quiz-overview.md). Nearly the whole screen — a question
 * with four options and an explanation needs it on a phone — but still a dialog: the list is
 * visible round its edge and a tap there closes it, which a full page could not offer.
 *
 * Previous / Next step through the questions in quiz order, sliding in the direction of travel
 * (docs/development/motion.md, "Direction means something"). Edits write straight to the
 * question context as they are typed — the editors already do — so there is no save step and
 * closing can't lose anything.
 */
export const QuestionEditorDialog = ({
  questionId,
  onQuestionChange,
  onRemove,
}: QuestionEditorDialogProps) => {
  const { addedQuestions, setDisplayQuestion } = useQuiz();
  const reducedMotion = usePrefersReducedMotion();
  // +1 forward, -1 back: which side the next question slides in from.
  const [direction, setDirection] = useState(1);

  const index = addedQuestions.findIndex((q) => q.id === questionId);
  const question: QuizQuestion | undefined = addedQuestions[index];
  const open = questionId !== null && question !== undefined;

  const goTo = (nextIndex: number) => {
    const next = addedQuestions[nextIndex];
    if (!next) return;
    setDirection(nextIndex > index ? 1 : -1);
    // The editors and the settings card read the context's display question in places.
    setDisplayQuestion(next);
    onQuestionChange(next.id);
  };

  const remove = () => {
    if (!question) return;
    // Land on the question that takes this one's place, else the one before, else close.
    const neighbour = addedQuestions[index + 1] ?? addedQuestions[index - 1];
    onRemove(question.id);
    onQuestionChange(neighbour ? neighbour.id : null);
  };

  const offset = reducedMotion ? 0 : 32;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onQuestionChange(null)}>
      <DialogContent
        // Nearly full screen with a gutter, so it still reads as a layer over the list and the
        // gutter is somewhere to tap to close. dvh with a vh fallback (docs/RESPONSIVE.md).
        className="flex h-[calc(100vh-1.5rem)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 supports-[height:100dvh]:h-[calc(100dvh-1.5rem)] sm:w-[calc(100%-2rem)]"
        // Don't throw the keyboard up over the question on a phone the moment it opens.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {question && (
          <>
            {/* pr-12 clears the dialog's own close button in the corner. */}
            <div className="flex flex-none items-center gap-2 border-b border-border px-4 py-3 pr-12">
              <DialogTitle className="text-base font-semibold">
                Question {index + 1}{" "}
                <span className="font-normal text-muted-foreground">of {addedQuestions.length}</span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Edit the question, its answers and its settings. Changes apply as you type.
              </DialogDescription>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={remove}
                className="ml-auto h-9 gap-1.5 px-2.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={question.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * offset }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * offset }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-4 p-3 sm:p-4"
                >
                  {question.id > 0 ? (
                    <ExistingQuestionCard question={question as AnyQuestion} />
                  ) : (
                    <NewQuestionCard question={question as NewAnyQuestion} />
                  )}
                  <section aria-label="Points and time" className="rounded-lg border border-border">
                    <h3 className="border-b border-border px-4 py-2.5 text-sm font-semibold sm:px-5">
                      Points and time
                    </h3>
                    {/* No title: the question is the field right above (showTitle). */}
                    <QuestionSettingsCard
                      question={question}
                      showCopyActions={addedQuestions.length > 1}
                      showTitle={false}
                    />
                  </section>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Previous · Done · Next. Done is the primary: closing is the common end, and the
                edits are already applied. */}
            <div className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-border px-3 py-3">
              <Button
                type="button"
                variant="ghost"
                disabled={index <= 0}
                onClick={() => goTo(index - 1)}
                className="h-10 justify-self-start gap-1 px-2 text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <LiftedButton
                type="button"
                onClick={() => onQuestionChange(null)}
                className="flex items-center gap-2 px-6"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Done
              </LiftedButton>
              <Button
                type="button"
                variant="ghost"
                disabled={index >= addedQuestions.length - 1}
                onClick={() => goTo(index + 1)}
                className="h-10 justify-self-end gap-1 px-2 text-sm"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

