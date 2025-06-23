import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { NewMultipleChoiceQuestion } from "../../../../types";

interface NewMultipleChoiceOptionsProps {
  question: NewMultipleChoiceQuestion;
  truncateText: (text: string, length: number) => string;
}

export const NewMultipleChoiceOptions: React.FC<NewMultipleChoiceOptionsProps> = ({
  question,
  truncateText
}) => (
  <>
    <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
      {question.answerOptions?.slice(0, 4).map((option, i) => (
        <div
          key={i}
          className={cn(
            "text-xs border rounded-md px-3 py-2 flex items-center transition-all duration-200",
            option.isCorrect
              ? "border-green-500/30 bg-green-100 dark:bg-green-900/30 shadow-sm"
              : "border-foreground/10 hover:border-foreground/20"
          )}
        >
          <div
            className={cn(
              "w-3 h-3 rounded-full mr-2 border transition-all",
              option.isCorrect
                ? "bg-green-500 border-green-600"
                : "border-muted-foreground/40"
            )}
          ></div>
          <span className="truncate">
            {truncateText(option.text, 20) || `Option ${i + 1}`}
          </span>
        </div>
      ))}
    </div>

    {question.allowMultipleSelections && (
      <Badge variant="outline" className="h-5 px-2 text-xs">
        Multi-select
      </Badge>
    )}
  </>
);