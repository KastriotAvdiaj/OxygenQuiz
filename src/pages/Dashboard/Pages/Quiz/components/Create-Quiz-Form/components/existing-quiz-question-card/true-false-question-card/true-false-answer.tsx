import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { TrueFalseQuestion } from "@/types/ApiTypes";

interface TrueFalseAnswersProps {
  question: TrueFalseQuestion;
}

export const TrueFalseAnswers: React.FC<TrueFalseAnswersProps> = ({
  question
}) => (
  <div className="my-6">
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((value) => (
        <div
          key={value.toString()}
          className={cn(
            "text-sm border rounded-lg px-4 py-3 flex items-center transition-all duration-200",
            question.correctAnswer === value
              ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
              : "border-foreground/20 hover:border-foreground/30 bg-muted/20 dark:bg-background/20"
          )}
        >
          <div
            className={cn(
              "w-4 h-4 rounded-full mr-3 border-2 transition-all flex items-center justify-center",
              question.correctAnswer === value
                ? "bg-green-500 border-green-600"
                : "border-muted-foreground/40"
            )}
          >
            {question.correctAnswer === value && (
              <CheckCircle size={10} className="text-white" />
            )}
          </div>
          <span className="flex-1">{value ? "True" : "False"}</span>
          {question.correctAnswer === value && (
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