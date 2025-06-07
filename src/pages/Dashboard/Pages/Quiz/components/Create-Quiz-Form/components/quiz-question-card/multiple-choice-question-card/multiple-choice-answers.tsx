import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { MultipleChoiceQuestion } from "@/types/ApiTypes";

interface MultipleChoiceAnswersProps {
  question: MultipleChoiceQuestion;
}

export const MultipleChoiceAnswers: React.FC<MultipleChoiceAnswersProps> = ({
  question
}) => (
  <div className="my-6">
    <div className="grid grid-cols-2 gap-3">
      {question.answerOptions?.map((option, i) => (
        <div
          key={i}
          className={cn(
            "text-sm border rounded-lg px-4 py-3 flex items-center transition-all duration-200",
            question.answerOptions.length === 3 && i === 2 && "col-span-2",
            question.answerOptions.length === 2 && "col-span-2",
            option.isCorrect
              ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
              : "border-foreground/20 hover:border-foreground/30 bg-muted/20 dark:bg-background/20"
          )}
        >
          <div
            className={cn(
              "w-4 h-4 rounded-full mr-3 border-2 transition-all flex items-center justify-center",
              option.isCorrect
                ? "bg-green-500 border-green-600"
                : "border-muted-foreground/40"
            )}
          >
            {option.isCorrect && (
              <CheckCircle size={10} className="text-white" />
            )}
          </div>
          <span className="flex-1">
            {option.text || `Option ${i + 1}`}
          </span>
          {option.isCorrect && (
            <Badge
              variant="outline"
              className="ml-2 text-xs text-green-700 border-green-500"
            >
              Correct
            </Badge>
          )}
        </div>
      ))}
    </div>
  </div>
);