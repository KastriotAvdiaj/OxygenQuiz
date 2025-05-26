import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TypeTheAnswerQuestion } from "@/types/ApiTypes";
import {
  ImageIcon,
  CaseSensitive,
  SearchCheck,
  SearchX,
  Type,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface SimpleTypeTheAnswerQuestionCardProps {
  question: TypeTheAnswerQuestion;
  isSelected?: boolean;
  onSelectionChange?: (questionId: number, selected: boolean) => void;
  selectionDisabled?: boolean;
}

export const SimpleTypeTheAnswerQuestionCard = ({
  question,
  isSelected = false,
  onSelectionChange,
  selectionDisabled = false,
}: SimpleTypeTheAnswerQuestionCardProps) => {
  return (
    <Card
      className={cn(
        "mb-3 border shadow-sm dark:border-foreground/20 transition-all duration-200 cursor-pointer hover:shadow-md",
        isSelected
          ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
          : "dark:bg-primary/5"
      )}
      onClick={() =>
        !selectionDisabled && onSelectionChange?.(question.id, !isSelected)
      }
    >
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start gap-3">
          {onSelectionChange && (
            <Checkbox
              checked={isSelected}
              disabled={selectionDisabled}
              onChange={() => onSelectionChange(question.id, !isSelected)}
              className="mt-1 flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <CardTitle className="text-base leading-tight flex-1 pr-2">
                {question.text}
                {question.imageUrl && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50"
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    <span className="text-blue-600 dark:text-blue-400 text-xs">
                      Image
                    </span>
                  </Badge>
                )}
              </CardTitle>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs">
                  ID: {question.id}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    question.difficulty.level === "Easy" &&
                      "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50",
                    question.difficulty.level === "Medium" &&
                      "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
                    question.difficulty.level === "Hard" &&
                      "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50"
                  )}
                >
                  {question.difficulty.level}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-normal">
                {question.category.name}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                {question.language.language}
              </Badge>

              {/* Quick evaluation indicators */}
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-normal flex items-center gap-1",
                    question.isCaseSensitive
                      ? "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50"
                      : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800/50"
                  )}
                >
                  <CaseSensitive className="h-3 w-3" />
                  {question.isCaseSensitive ? "Case Sen." : "Case Ins."}
                </Badge>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-normal flex items-center gap-1",
                    question.allowPartialMatch
                      ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50"
                      : "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50"
                  )}
                >
                  {question.allowPartialMatch ? (
                    <SearchCheck className="h-3 w-3" />
                  ) : (
                    <SearchX className="h-3 w-3" />
                  )}
                  {question.allowPartialMatch ? "Partial" : "Exact"}
                </Badge>
              </div>

              {question.acceptableAnswers.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground"
                >
                  +{question.acceptableAnswers.length} alt answers
                </Badge>
              )}
            </div>

            {/* Show correct answer preview */}
            <div className="mt-2 p-2 rounded-md bg-muted/30 dark:bg-muted/20 border">
              <div className="flex items-center gap-2">
                <Type className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Answer:</span>
                <span className="text-xs font-mono font-medium text-foreground truncate">
                  {question.correctAnswer}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
