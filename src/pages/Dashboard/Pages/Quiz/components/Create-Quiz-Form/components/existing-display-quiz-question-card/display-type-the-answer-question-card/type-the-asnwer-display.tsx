import React from "react";
import { Badge } from "@/components/ui/badge";
import { Edit3 } from "lucide-react";
import { TypeTheAnswerQuestion } from "@/types/question-types";

interface TypeTheAnswerDisplayProps {
  question: TypeTheAnswerQuestion;
}

export const TypeTheAnswerDisplay: React.FC<TypeTheAnswerDisplayProps> = ({
  question,
}) => (
  <div className="my-6">
    <div className="border border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm rounded-lg px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <Edit3 size={16} className="text-green-600" />
        <span className="text-sm font-medium text-green-700 dark:text-green-400">
          Correct Answer
        </span>
      </div>
      <div className="text-base font-mono bg-white dark:bg-gray-800 rounded px-3 py-2 border border-green-200">
        {question.correctAnswer || "Answer not set"}
      </div>

      <div className="flex gap-2 mt-3">
        {question.isCaseSensitive && (
          <Badge variant="outline" className="text-xs">
            Case Sensitive
          </Badge>
        )}
        {question.allowPartialMatch && (
          <Badge variant="outline" className="text-xs">
            Partial Match
          </Badge>
        )}
      </div>

      {question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
        <div className="mt-3">
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">
            Alternative Answers ({question.acceptableAnswers.length})
          </span>
          <div className="grid gap-1 mt-1">
            {question.acceptableAnswers.slice(0, 2).map((answer, i) => (
              <div
                key={i}
                className="text-xs font-mono bg-green-50 dark:bg-green-900/20 rounded px-2 py-1 border border-green-200/50"
              >
                {answer}
              </div>
            ))}
            {question.acceptableAnswers.length > 2 && (
              <div className="text-xs text-green-600 dark:text-green-400">
                +{question.acceptableAnswers.length - 2} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);
