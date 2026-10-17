// import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useQuiz } from "../../Quiz-questions-context";
import { AnyQuestion } from "@/types/question-types";
import { NewAnyQuestion } from "../../types";
import { SmallQuestionCard } from "./small-question-card";
import { MotionConfig, motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { useDragReorder } from "../overview/use-drag-reorder";

export function isAnyQuestion(
  question: AnyQuestion | NewAnyQuestion
): question is AnyQuestion {
  return typeof question.id === "number";
}

export const CreatedQuestionsPanel = ({}) => {
  const { isOpen, close } = useDisclosure();
  const { addedQuestions, reorderQuestions } = useQuiz();
  // Same drag as the overview's cards: by the grip (the card's own click selects it), with
  // edge auto-scroll inside this panel's scroller (docs/quiz/quiz-overview.md, "Reordering").
  const { listRef, itemRef, handleProps, positionedId, liftedId, dragY } = useDragReorder({
    items: addedQuestions,
    getId: (q) => q.id,
    onReorder: reorderQuestions,
  });

  return (
    <>
      <Card className="w-full shadow-none border-2 border-primary/30 bg-background py-0 lg:h-full flex flex-col lg:overflow-hidden">
        <CardHeader className="rounded-t border-primary/30 border-b p-3 bg-primary/10 flex-none">
          <CardTitle className="flex justify-between items-center text-sm ">
            <span>Quiz Questions ({addedQuestions.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {addedQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No questions added yet
            </p>
          ) : (
            <MotionConfig reducedMotion="user">
              <div
                ref={listRef as React.RefObject<HTMLDivElement>}
                className="relative space-y-3"
              >
                {addedQuestions.map((question) => {
                  const isPositioned = positionedId === question.id;
                  return (
                    <motion.div
                      key={question.id}
                      ref={itemRef(question.id)}
                      layout={isPositioned ? false : "position"}
                      animate={{
                        ...(isPositioned ? {} : { y: 0 }),
                        scale: liftedId === question.id ? 1.02 : 1,
                      }}
                      transition={{
                        duration: 0.2,
                        ease: "easeOut",
                                      }}
                      style={{
                        y: isPositioned ? dragY : undefined,
                        zIndex: isPositioned ? 10 : undefined,
                      }}
                      className="relative flex items-stretch gap-1"
                    >
                      <button
                        type="button"
                        aria-label="Drag to reorder"
                        title="Drag, or use the arrow keys, to move"
                        {...handleProps(question.id)}
                        className="flex w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <SmallQuestionCard question={question} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </MotionConfig>
          )}
        </CardContent>
      </Card>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={close}
        />
      )}
    </>
  );
};
