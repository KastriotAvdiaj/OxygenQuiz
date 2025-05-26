// src/components/questions/QuestionCard.tsx (or a similar path)

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
  // selectionDisabled prop might still be useful if some questions in a list should not be selectable for other reasons,independent of the quiz selection limit.
  selectionDisabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectionDisabled: externalSelectionDisabled = false,
}) => {
  const { addQuestionToQuiz, removeQuestionFromQuiz, isQuestionSelected } =
    useQuiz();

  const isSelected = isQuestionSelected(question.id);

  // You might have a quiz-level selection limit, which can also disable selection
  const { selectedQuestions } = useQuiz();
  const MAX_SELECTED_QUESTIONS = 5;
  const quizSelectionDisabled =
    selectedQuestions.length >= MAX_SELECTED_QUESTIONS && !isSelected;
  const finalSelectionDisabled =
    externalSelectionDisabled || quizSelectionDisabled;

  const handleCheckboxChange = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click when clicking checkbox
    if (finalSelectionDisabled) return;

    if (isSelected) {
      removeQuestionFromQuiz(question.id);
    } else {
      addQuestionToQuiz(question); // Pass the whole question object
    }
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
              <Type className="h-3 w-3 mr-1" /> {/* Example Icon */}
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
        // Exhaustiveness check - TypeScript will warn if a case is missed
        // const _exhaustiveCheck: never = question;
        return null;
    }
  };

  return (
    <Card
      className={cn(
        "mb-3 border shadow-md transition-all duration-200 hover:shadow-md relative overflow-hidden",
        !finalSelectionDisabled && "cursor-pointer",
        isSelected
          ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800/50"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        finalSelectionDisabled && !isSelected
          ? "opacity-50 cursor-not-allowed hover:shadow-sm"
          : "",
        "bg-white dark:bg-gray-900"
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400" />
      )}

      <CardHeader className="pb-3 pt-4 pl-6">
        <div className="flex items-start gap-3">
          {/* Checkbox is always present, its behavior is controlled by context */}
          <div className="relative">
            <Checkbox
              checked={isSelected}
              disabled={finalSelectionDisabled}
              onClick={handleCheckboxChange} // This will call with event, handled by stopPropagation
              className={cn(
                "mt-1 flex-shrink-0 transition-all duration-200",
                isSelected && "bg-blue-500 border-blue-500 text-white"
              )}
              aria-label={`Select question ${question.id}`}
            />
            {isSelected &&
              !finalSelectionDisabled && ( // Only show check if truly selected and interactive
                <Check className="absolute top-1.5 left-0.5 h-3 w-3 text-white pointer-events-none" />
              )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Top Row: Title, Image Badge, ID, Difficulty */}
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
                {/* <Badge
                  variant="outline"
                  className={cn(
                    "text-xs transition-colors duration-200",
                    isSelected
                      ? "border-blue-300 dark:border-blue-600/50 text-blue-700 dark:text-blue-300"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                  )}
                >
                  ID: {question.id}
                </Badge> */}{" "}
                {/* I don't think I need to show this */}
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

            {/* Middle Row: Type-Specific Details */}
            <div className="flex flex-wrap items-center gap-2">
              {renderTypeSpecificDetails()}
            </div>

            {/* Bottom Row: Selection indicator text */}
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
