import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useQuiz } from "../../../../Quiz-questions-context";

interface NewSmallQuestionHeaderProps {
  icon: React.ReactNode;
  questionType: string;
  badgeColor: string;
  questionId: number; // Changed to number to match your context
  className?: string;
}

export const NewSmallQuestionHeader: React.FC<NewSmallQuestionHeaderProps> = ({
  icon,
  questionType,
  badgeColor,
  questionId,
  className,
}) => {
  const { removeQuestionFromQuiz, addedQuestions } = useQuiz();

  const questionIndex = addedQuestions.findIndex((q) => q.id === questionId);
  const questionNumber = questionIndex !== -1 ? questionIndex + 1 : null;

  const handleRemove = () => {
    removeQuestionFromQuiz(questionId);
  };

  return (
    <div
      className={cn(`px-4 py-2 flex justify-between items-center `, className)}
    >
      <div className="flex items-center gap-2">
        {questionNumber && (
          <Badge variant="outline" className="h-5 px-2 text-xs font-semibold">
            #{questionNumber}
          </Badge>
        )}
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs",
            badgeColor
          )}
        >
          {icon}
        </div>
        <Badge
          variant="secondary"
          className={cn("h-5 px-2 text-xs", badgeColor)}
        >
          {questionType}
        </Badge>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-red-500"
        onClick={handleRemove}
        title="Remove question"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
};
