import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { TrueFalseQuestion } from "@/types/question-types";

interface TrueFalseOptionsProps {
  question: TrueFalseQuestion;
}

export const TrueFalseOptions: React.FC<TrueFalseOptionsProps> = ({
  question
}) => (
  <div className="flex gap-2 mt-1 mb-3">
    <div
      className={cn(
        "text-sm border rounded-md px-4 py-3 flex items-center justify-center flex-1 transition-all duration-200",
        question.correctAnswer
          ? "border-green-500/30 bg-green-100 dark:bg-green-900/30 shadow-sm"
          : "border-foreground/10"
      )}
    >
      <CheckCircle
        size={16}
        className={cn(
          "mr-2",
          question.correctAnswer
            ? "text-green-600"
            : "text-muted-foreground"
        )}
      />
      <span className="font-medium">True</span>
    </div>
    <div
      className={cn(
        "text-sm border rounded-md px-4 py-3 flex items-center justify-center flex-1 transition-all duration-200",
        !question.correctAnswer
          ? "border-green-500/30 bg-green-100 dark:bg-green-900/30 shadow-sm"
          : "border-foreground/10"
      )}
    >
      <XCircle
        size={16}
        className={cn(
          "mr-2",
          !question.correctAnswer
            ? "text-green-600"
            : "text-muted-foreground"
        )}
      />
      <span className="font-medium">False</span>
    </div>
  </div>
);