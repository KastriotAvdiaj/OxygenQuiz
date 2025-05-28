import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AnyQuestion,
  QuestionType,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  TypeTheAnswerQuestion,
} from "@/types/ApiTypes";
import { ImageIcon, Check, CheckCircle, XCircle, Type } from "lucide-react";
import { cn } from "@/utils/cn";
import { useQuiz } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/QuizQuestionsContext";

interface QuestionCardProps {
  question: AnyQuestion;
  selectionDisabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectionDisabled: externalSelectionDisabled = false,
}) => {
  const {
    addToTempSelection,
    removeFromTempSelection,
    isTempSelected: isQuestionTempSelectedInContext, // Renamed for clarity or use original and rename local var
    isQuestionModalOpen,
    tempSelectedQuestions,
    isQuestionSelected, // Still need this to check if already in permanent quiz
  } = useQuiz();

  // Check if this question is already permanently selected in the quiz
  const isPermanentlySelected = isQuestionSelected(question.id);

  // Check if this question is temporarily selected in the modal
  // Call the context function (now aliased or use original name) and store result in a new variable
  const isCurrentCardTempSelected = isQuestionTempSelectedInContext(question.id);

  // If modal is open, use temp selection state; otherwise, use permanent selection state
  const isSelected = isQuestionModalOpen ? isCurrentCardTempSelected : isPermanentlySelected;

  // Selection limits
  const MAX_SELECTED_QUESTIONS = 5;

  // When modal is open, check temp selection limit;
  // currentSelectionCount is 0 when modal is not open, making quizSelectionDisabled false,
  // which is fine as interactions are disabled then.
  const currentSelectionCount = isQuestionModalOpen ? tempSelectedQuestions.length : 0;
  const quizSelectionDisabled = currentSelectionCount >= MAX_SELECTED_QUESTIONS && !isSelected;

  // Disable selection if question is already permanently in quiz (when modal is open)
  const alreadyInQuizDisabled = isQuestionModalOpen && isPermanentlySelected;

  const finalSelectionDisabled =
    externalSelectionDisabled ||
    quizSelectionDisabled ||
    alreadyInQuizDisabled;

  const handleCheckboxChange = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click when clicking checkbox
    if (finalSelectionDisabled) return;

    // Only handle temp selection when modal is open
    if (isQuestionModalOpen) {
      // Use the boolean result for the current card
      if (isCurrentCardTempSelected) {
        removeFromTempSelection(question.id);
      } else {
        addToTempSelection(question); // Pass the whole question object
      }
    }
    // When modal is not open, this card should be read-only for permanent selections
  };

  // Common details
  const commonDetails = (
    <>
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
        {question.language.language}
      </Badge>
    </>
  );

  // Type-specific details rendering
  const renderTypeSpecificDetails = () => {
    switch (question.type) {
      case QuestionType.MultipleChoice:
        const mcq = question as MultipleChoiceQuestion;
        const correctAnswersCount = mcq.answerOptions.filter(
          (option) => option.isCorrect
        ).length;
        return (
          <>
            {commonDetails}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-normal transition-colors duration-200",
                isSelected
                  ? "bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              {mcq.allowMultipleSelections ? "Multi-Select" : "Single Select"}
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
          </>
        );
      case QuestionType.TrueFalse:
        const tfq = question as TrueFalseQuestion;
        return (
          <>
            {commonDetails}
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-normal flex items-center gap-1 transition-colors duration-200",
                tfq.correctAnswer
                  ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50"
                  : "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
                isSelected && "ring-1 ring-current/20"
              )}
            >
              {tfq.correctAnswer ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Answer: {tfq.correctAnswer ? "TRUE" : "FALSE"}
            </Badge>
          </>
        );
      case QuestionType.TypeTheAnswer:
        const ttaq = question as TypeTheAnswerQuestion;
        return (
          <>
            {commonDetails}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-normal transition-colors duration-200",
                isSelected
                  ? "bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <Type className="h-3 w-3 mr-1" />
              Type Answer
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
              Pattern: "{ttaq.correctAnswer}"
            </Badge>
            {ttaq.acceptableAnswers && ttaq.acceptableAnswers.length > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-normal transition-colors duration-200",
                  isSelected
                    ? "border-blue-300 dark:border-blue-600/50 text-blue-700 dark:text-blue-300"
                    : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                )}
              >
                {ttaq.acceptableAnswers.length} acceptable
              </Badge>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const getSelectionStatusText = () => {
    if (isPermanentlySelected && isQuestionModalOpen) {
      return "Already in Quiz";
    }
    if (isSelected) {
      return isQuestionModalOpen ? "Temporarily Selected" : "Selected";
    }
    return null;
  };

  const selectionStatusText = getSelectionStatusText();

  return (
    <Card
      className={cn(
        "mb-3 border shadow-md transition-all duration-200 hover:shadow-md relative overflow-hidden",
        !finalSelectionDisabled && isQuestionModalOpen && "cursor-pointer",
        isSelected
          ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800/50"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        finalSelectionDisabled && !isSelected
          ? "opacity-50 cursor-not-allowed hover:shadow-sm"
          : "",
        alreadyInQuizDisabled && "opacity-60",
        "bg-white dark:bg-gray-900"
      )}
      onClick={isQuestionModalOpen ? handleCheckboxChange : undefined}
    >
      {isSelected && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          isPermanentlySelected && isQuestionModalOpen
            ? "bg-green-500 dark:bg-green-400"
            : "bg-blue-500 dark:bg-blue-400"
        )} />
      )}

      <CardHeader className="pb-3 pt-4 pl-6">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Checkbox
              checked={isSelected}
              disabled={finalSelectionDisabled || !isQuestionModalOpen}
              onClick={handleCheckboxChange}
              className={cn(
                "mt-1 flex-shrink-0 transition-all duration-200",
                isSelected && "bg-blue-500 border-blue-500 text-white",
                isPermanentlySelected && isQuestionModalOpen && "bg-green-500 border-green-500"
              )}
              aria-label={`Select question ${question.id}`}
            />
            {isSelected && ( // Show checkmark overlay only when truly selected by the logic
               <Check className="absolute top-1.5 left-0.5 h-3 w-3 text-white pointer-events-none" />
            )}
          </div>

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
              {renderTypeSpecificDetails()}
            </div>

            {selectionStatusText && (
              <div className="mt-3 flex items-center gap-2">
                <div className={cn(
                  "h-px flex-1",
                  isPermanentlySelected && isQuestionModalOpen
                    ? "bg-green-200 dark:bg-green-800/50"
                    : "bg-blue-200 dark:bg-blue-800/50"
                )} />
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  isPermanentlySelected && isQuestionModalOpen
                    ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                    : "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"
                )}>
                  {selectionStatusText}
                </span>
                <div className={cn(
                  "h-px flex-1",
                  isPermanentlySelected && isQuestionModalOpen
                    ? "bg-green-200 dark:bg-green-800/50"
                    : "bg-blue-200 dark:bg-blue-800/50"
                )} />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default QuestionCard;