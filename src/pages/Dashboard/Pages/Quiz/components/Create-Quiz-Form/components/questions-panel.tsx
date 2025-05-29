// import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDisclosure } from "@/hooks/use-disclosure";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { useQuiz } from "../QuizQuestionsContext";
import { SmallQuestionCard } from "./small-question-card";
import { LiftedButton } from "@/common/LiftedButton";
import SelectQuestionComponent from "../question-select";

export const CreatedQuestionsPanel = ({}) => {
  const { isOpen, open, close } = useDisclosure();

  const handleOpenChange = () => {
    if (!isOpen) {
      open();
    } else {
      close();
    }
  };

  const { selectedQuestions } = useQuiz();
  console.log("Selected Questions:", selectedQuestions);

  return (
    <>
      <Card className="w-full shadow-none border-none bg-background py-0">
        <CardHeader className="border-b-2 border-primary/30 p-1">
          <CardTitle className="flex justify-between items-center text-sm">
            <span>Quiz Questions ({selectedQuestions.length})</span>
            <Popover modal={true} open={isOpen} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild onClick={open}>
                <Button type="button" variant="ghost" size="sm">
                  <PlusCircle size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="left"
                className="w-auto p-4 flex flex-col gap-2"
              >
                <SelectQuestionComponent />
                <LiftedButton>+ Create New</LiftedButton>
              </PopoverContent>
            </Popover>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-2 pb-0">
          {selectedQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No questions added yet
            </p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {selectedQuestions.map((question) => (
                <SmallQuestionCard key={question.id} question={question} />
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
