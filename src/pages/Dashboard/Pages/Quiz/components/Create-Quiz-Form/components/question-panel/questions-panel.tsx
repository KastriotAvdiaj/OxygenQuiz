// import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useQuiz } from "../../Quiz-questions-context";
import { AnyQuestion } from "@/types/question-types";
import { NewAnyQuestion } from "../../types";
import { SmallQuestionCard } from "./small-question-card";

export function isAnyQuestion(
  question: AnyQuestion | NewAnyQuestion
): question is AnyQuestion {
  return typeof question.id === "number";
}

export const CreatedQuestionsPanel = ({}) => {
  const { isOpen, close } = useDisclosure();
  const { addedQuestions } = useQuiz();

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
            <div className="space-y-3">
              {addedQuestions.map((question) => (
                <SmallQuestionCard
                  key={question.id}
                  question={question}
                />
              ))}
            </div>
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
