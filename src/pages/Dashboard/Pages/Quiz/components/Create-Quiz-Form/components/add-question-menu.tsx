import { useState } from "react";
import { Plus } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useQuiz } from "../Quiz-questions-context";
import {
  DEFAULT_NEW_MULTIPLE_CHOICE,
  DEFAULT_NEW_TRUE_FALSE,
  DEFAULT_NEW_TYPE_ANSWER,
} from "../constants";
import type { NewAnyQuestion } from "../types";
import SelectQuestionComponent from "./question-select/question-select";

const newQuestionOfType = {
  multipleChoice: (id: number): NewAnyQuestion => ({
    ...DEFAULT_NEW_MULTIPLE_CHOICE,
    id,
    answerOptions: DEFAULT_NEW_MULTIPLE_CHOICE.answerOptions.map((o) => ({ ...o })),
  }),
  trueFalse: (id: number): NewAnyQuestion => ({ ...DEFAULT_NEW_TRUE_FALSE, id }),
  typeTheAnswer: (id: number): NewAnyQuestion => ({
    ...DEFAULT_NEW_TYPE_ANSWER,
    id,
    acceptableAnswers: DEFAULT_NEW_TYPE_ANSWER.acceptableAnswers.map((a) => ({ ...a })),
  }),
};

export interface AddQuestionMenuProps {
  /**
   * `primary` is the builder header's blue button. `secondary` is the muted one, for the
   * overview's bottom bar, where the primary is Publish (CLAUDE.md, "User-facing buttons").
   */
  variant?: "primary" | "secondary";
  /** Which side of the trigger the menu opens on — `top` from a bar pinned to the bottom. */
  side?: "top" | "bottom";
  /** Width and spacing for the trigger's outer element. */
  outerClassName?: string;
  /**
   * Called with a question just created from scratch (not one picked from the pool), after it
   * has been added. The overview uses it to open the editor straight onto the blank question.
   */
  onCreated?: (question: NewAnyQuestion) => void;
}

/**
 * "+ Add a question": a menu offering the public pool or a new question, then — for a new one —
 * the choice of type. Lifted out of `create-quiz.tsx` so the desktop builder's header and the
 * overview's bottom bar open the same flow.
 */
export const AddQuestionMenu = ({
  variant = "primary",
  side = "bottom",
  outerClassName,
  onCreated,
}: AddQuestionMenuProps) => {
  const { addQuestionToQuiz } = useQuiz();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Owned here rather than inside the menu, so each survives the menu closing.
  const [isPoolOpen, setIsPoolOpen] = useState(false);
  const [isTypeChooserOpen, setIsTypeChooserOpen] = useState(false);

  const create = (make: (id: number) => NewAnyQuestion) => {
    const question = make(-Date.now());
    addQuestionToQuiz(question);
    setIsTypeChooserOpen(false);
    onCreated?.(question);
  };

  return (
    <>
      {/* No backdrop. There was a blurred one, faded in — and animating a `backdrop-filter`
          makes the browser re-blur the whole page every frame, which read as the screen
          flickering. A popover menu doesn't need the page dimmed behind it anyway; it has its
          own enter animation (docs/development/motion.md, "What not to animate"). */}
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
          <LiftedButton
            type="button"
            outerClassName={outerClassName}
            {...(variant === "secondary"
              ? {
                  size: "sm" as const,
                  className: "flex items-center justify-center gap-1.5 bg-muted text-foreground",
                  liftColor: "muted-foreground",
                }
              : { className: "flex items-center gap-2" })}
          >
            <Plus className="h-4 w-4" />
            Add a question
          </LiftedButton>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side={side}
          sideOffset={10}
          className="z-50 w-56 p-3 flex flex-col gap-2.5 bg-background dark:border-foreground/20"
        >
          {/* size="sm": the menu's two choices at the size of the button that opened it. */}
          <LiftedButton
            type="button"
            size="sm"
            outerClassName="w-full"
            liftColor="muted"
            className="w-full justify-center gap-1.5 bg-muted text-foreground border border-foreground/20"
            onClick={() => {
              setIsMenuOpen(false);
              setIsPoolOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Browse Public Pool
          </LiftedButton>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <LiftedButton
            type="button"
            size="sm"
            outerClassName="w-full"
            className="w-full justify-center flex items-center gap-1.5"
            onClick={() => {
              setIsMenuOpen(false);
              setIsTypeChooserOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Create New
          </LiftedButton>
        </PopoverContent>
      </Popover>

      <SelectQuestionComponent open={isPoolOpen} onOpenChange={setIsPoolOpen} />

      <Dialog open={isTypeChooserOpen} onOpenChange={setIsTypeChooserOpen}>
        <DialogContent className="bg-background p-4 rounded-md pt-8 dark:border border-foreground/30">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center">
              Choose the type of question
            </DialogTitle>
          </DialogHeader>
          {/* A grid, not a flex row: flex shrinks the labels' content boxes while the padding
              stays, so three fixed-padding buttons wrapped mid-phrase at three widths. Equal
              columns, stacked below `sm`. See docs/RESPONSIVE.md, "Rows of buttons". */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <LiftedButton
              type="button"
              outerClassName="w-full"
              className="h-full w-full text-center text-sm leading-tight"
              onClick={() => create(newQuestionOfType.multipleChoice)}
            >
              Multiple Choice
            </LiftedButton>
            <LiftedButton
              type="button"
              outerClassName="w-full"
              className="h-full w-full text-center text-sm leading-tight"
              onClick={() => create(newQuestionOfType.trueFalse)}
            >
              True/False
            </LiftedButton>
            <LiftedButton
              type="button"
              outerClassName="w-full"
              className="h-full w-full text-center text-sm leading-tight"
              onClick={() => create(newQuestionOfType.typeTheAnswer)}
            >
              Type The Answer
            </LiftedButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
