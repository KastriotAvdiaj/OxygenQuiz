import React from "react";
import { Badge } from "@/components/ui/badge";
import { Edit3 } from "lucide-react";
import { TypeTheAnswerQuestion } from "@/types/question-types";

interface SmallTypeAnswerDisplayProps {
  question: TypeTheAnswerQuestion;
  truncateText: (text: string, length: number) => string;
}

export const SmallTypeAnswerDisplay: React.FC<SmallTypeAnswerDisplayProps> = ({
  question,
  truncateText
}) => (
  <>
    <div className="mt-1 mb-3">
      <div className="border-2 border-dashed border-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Edit3 size={14} className="text-green-600" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Correct Answer
          </span>
        </div>
        <div className="text-sm font-mono bg-white dark:bg-gray-800 rounded px-2 py-1 border">
          {truncateText(question.correctAnswer, 30) || "Answer not set"}
        </div>
      </div>

      {question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">
            + {question.acceptableAnswers.length} alternative answers
          </span>
        </div>
      )}
    </div>

    <div className="flex gap-1">
      {question.isCaseSensitive && (
        <Badge variant="outline" className="h-5 px-1 text-xs">
          Case
        </Badge>
      )}
      {question.allowPartialMatch && (
        <Badge variant="outline" className="h-5 px-1 text-xs">
          Partial
        </Badge>
      )}
    </div>
  </>
);