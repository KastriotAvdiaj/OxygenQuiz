import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { QuestionCard } from "./small-question-card";

interface CreatedQuestionsPanelProps {
  onAddPrivateQuestion: () => void;
  onAddPublicQuestion?: () => void;
  questions?: Array<any>;
  publicQuestions?: Array<any>;
  difficulties?: Array<any>;
  categories?: Array<any>;
  onRemoveQuestion?: (index: number) => void;
  onRemovePublicQuestion?: (index: number) => void;
  onSelectQuestion: (index: number) => void;
  activeQuestionIndex: number;
}

export const CreatedQuestionsPanel: React.FC<CreatedQuestionsPanelProps> = ({
  onAddPrivateQuestion,
  onAddPublicQuestion,
  questions = [],
  publicQuestions = [],
  difficulties = [],
  categories = [],
  onRemoveQuestion,
  onRemovePublicQuestion,
  onSelectQuestion,
  activeQuestionIndex,
}) => {
  const { isOpen, open, close } = useDisclosure();

  const handleOpenChange = (shouldBeOpen: boolean) => {
    if (shouldBeOpen) {
      open();
    } else {
      close();
    }
  };

  const getDifficultyName = (id: number) => {
    const difficulty = difficulties.find((d) => d.id === id);
    return difficulty?.name || "Unknown";
  };

  const getCategoryName = (id: number) => {
    const category = categories.find((c) => c.id === id);
    return category?.name || "General";
  };

  // Total count of all questions
  const totalQuestions = questions.length + publicQuestions.length;

  return (
    <>
      <Card className="w-full shadow-none border-none bg-background py-0">
        <CardHeader className="border-b-2 border-primary/30">
          <CardTitle className="flex justify-between items-center">
            <span>Quiz Questions ({totalQuestions})</span>
            <Popover modal={true} open={isOpen} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild onClick={open}>
                <Button type="button" variant="ghost" size="sm">
                  <PlusCircle size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" className="w-auto p-4">
                <div className="flex flex-col gap-4">
                  {onAddPublicQuestion && (
                    <Button
                      onClick={() => {
                        close();
                        onAddPublicQuestion();
                      }}
                    >
                      <PlusCircle size={16} className="mr-2" /> Add Public
                      Question
                    </Button>
                  )}

                  <Button
                  variant={"outline"}
                    onClick={() => {
                      close();
                      onAddPrivateQuestion();
                    }}
                  >
                    <PlusCircle size={16} className="mr-2" /> New Question
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-3 pb-0">
          {totalQuestions === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <p className="mb-4">No questions added yet</p>
              <Button
                onClick={onAddPrivateQuestion}
                variant="outline"
                size="sm"
              >
                <PlusCircle size={16} className="mr-2" /> Add Question
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)] pr-6 ">
              {/* Private questions */}
              {questions.map((question, index) => (
                <QuestionCard
                  key={`private-${index}`}
                  question={question}
                  index={index}
                  difficulty={getDifficultyName(question.difficultyId)}
                  category={getCategoryName(question.categoryId)}
                  isPrivate={true}
                  isActive={index === activeQuestionIndex}
                  onRemove={() => onRemoveQuestion && onRemoveQuestion(index)}
                  onClick={() => onSelectQuestion(index)}
                />
              ))}

              {/* Public questions */}
              {publicQuestions.map((question, index) => (
                <QuestionCard
                  key={`public-${index}`}
                  question={question}
                  index={questions.length + index}
                  difficulty={getDifficultyName(question.difficultyId)}
                  category={getCategoryName(question.categoryId)}
                  isPrivate={false}
                  isActive={questions.length + index === activeQuestionIndex}
                  onRemove={() =>
                    onRemovePublicQuestion && onRemovePublicQuestion(index)
                  }
                  onClick={() => onSelectQuestion(questions.length + index)}
                />
              ))}
            </ScrollArea>
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
