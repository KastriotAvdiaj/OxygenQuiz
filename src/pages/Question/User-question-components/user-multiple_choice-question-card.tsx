import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MultipleChoiceQuestion,
  AnswerOption,
} from "@/types/ApiTypes";
import { ImageIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface SimpleMultipleChoiceQuestionCardProps {
  question: MultipleChoiceQuestion;
  isSelected?: boolean;
  onSelectionChange?: (questionId: number, selected: boolean) => void;
  selectionDisabled?: boolean;
}

export const SimpleMultipleChoiceQuestionCard = ({
  question,
  isSelected = false,
  onSelectionChange,
  selectionDisabled = false,
}: SimpleMultipleChoiceQuestionCardProps) => {
  const correctAnswersCount = question.answerOptions.filter(
    (option: AnswerOption) => option.isCorrect
  ).length;

  return (
    <Card 
      className={cn(
        "mb-3 border shadow-sm dark:border-foreground/20 transition-all duration-200 cursor-pointer hover:shadow-md",
        isSelected 
          ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10" 
          : "dark:bg-primary/5"
      )}
      onClick={() => !selectionDisabled && onSelectionChange?.(question.id, !isSelected)}
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
                    <span className="text-blue-600 dark:text-blue-400 text-xs">Image</span>
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
                {question.allowMultipleSelections ? "Multi-Select" : "Single Select"}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                {question.language.language}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                {correctAnswersCount} correct answer{correctAnswersCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};