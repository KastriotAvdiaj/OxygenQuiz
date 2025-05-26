import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MultipleChoiceQuestion, AnswerOption } from "@/types/ApiTypes";
import { ImageIcon, Check } from "lucide-react";
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

  // const handleCardClick = () => {
  //   if (!selectionDisabled && onSelectionChange) {
  //     onSelectionChange(question.id, !isSelected);
  //   }
  // };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking checkbox
    if (!selectionDisabled && onSelectionChange) {
      onSelectionChange(question.id, !isSelected);
    }
  };

  return (
    <Card
      className={cn(
        "mb-3 border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md relative overflow-hidden",
        isSelected
          ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800/50"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        selectionDisabled && !isSelected
          ? "opacity-50 cursor-not-allowed hover:shadow-sm"
          : "",
        "bg-white dark:bg-gray-900"
      )}
      // onClick={handleCardClick} //THIS WAS CAUSING AN ERROR WHEN CLICKING THE CARD.
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400" />
      )}

      <CardHeader className="pb-3 pt-4 pl-6">
        <div className="flex items-start gap-3">
          {onSelectionChange && (
            <div className="relative">
              <Checkbox
                checked={isSelected}
                disabled={selectionDisabled}
                onClick={handleCheckboxChange}
                className={cn(
                  "mt-1 flex-shrink-0 transition-all duration-200",
                  isSelected && "bg-blue-500 border-blue-500 text-white"
                )}
              />
              {isSelected && (
                <Check className="absolute top-1.5 left-0.5 h-3 w-3 text-white pointer-events-none" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <CardTitle
                className={cn(
                  "text-base leading-tight flex-1 pr-2 transition-colors duration-200",
                  isSelected
                    ? "text-blue-900 dark:text-blue-100"
                    : "text-gray-900 dark:text-gray-100"
                )}
              >
                {question.text}
                {question.imageUrl && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-2 transition-colors duration-200",
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-800/30 border-blue-300 dark:border-blue-600/50"
                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50"
                    )}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    <span className="text-blue-600 dark:text-blue-400 text-xs">
                      Image
                    </span>
                  </Badge>
                )}
              </CardTitle>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs transition-colors duration-200",
                    isSelected
                      ? "border-blue-300 dark:border-blue-600/50 text-blue-700 dark:text-blue-300"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                  )}
                >
                  ID: {question.id}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs transition-colors duration-200",
                    question.difficulty.level === "Easy" &&
                      "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50",
                    question.difficulty.level === "Medium" &&
                      "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
                    question.difficulty.level === "Hard" &&
                      "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
                    isSelected && "ring-1 ring-current/20"
                  )}
                >
                  {question.difficulty.level}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-normal transition-colors duration-200",
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
              >
                {question.category.name}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-normal transition-colors duration-200",
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
              >
                {question.allowMultipleSelections
                  ? "Multi-Select"
                  : "Single Select"}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-normal transition-colors duration-200",
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
              >
                {question.language.language}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-normal transition-colors duration-200",
                  isSelected
                    ? "border-blue-300 dark:border-blue-600/50 text-blue-700 dark:text-blue-300"
                    : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                )}
              >
                {correctAnswersCount} correct answer
                {correctAnswersCount !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Selection indicator text */}
            {isSelected && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800/50" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  Selected
                </span>
                <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800/50" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
