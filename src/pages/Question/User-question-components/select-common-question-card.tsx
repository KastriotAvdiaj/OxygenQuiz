import React, { useMemo, useCallback } from "react";
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
import {
  ImageIcon,
  Check,
  CheckCircle,
  XCircle,
  Type,
  Trash2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useQuiz } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/QuizQuestionsContext";

interface CommonSelectQuestionCard {
  question: AnyQuestion;
  selectionDisabled?: boolean;
}

const MAX_SELECTED_QUESTIONS = 5;

// Memoized badge components
const CategoryBadge = React.memo<{ category: string; isSelected: boolean }>(
  ({ category, isSelected }) => (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-normal transition-colors duration-200",
        isSelected
          ? "bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      )}
    >
      {category}
    </Badge>
  )
);

const LanguageBadge = React.memo<{ language: string; isSelected: boolean }>(
  ({ language, isSelected }) => (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-normal transition-colors duration-200",
        isSelected
          ? "bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      )}
    >
      {language}
    </Badge>
  )
);

const DifficultyBadge = React.memo<{ difficulty: string; isSelected: boolean }>(
  ({ difficulty, isSelected }) => (
    <Badge
      variant="outline"
      className={cn(
        "text-xs transition-colors duration-200",
        difficulty === "Easy" &&
          "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50",
        difficulty === "Medium" &&
          "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
        difficulty === "Hard" &&
          "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
        isSelected && "ring-1 ring-current/20"
      )}
    >
      {difficulty}
    </Badge>
  )
);

// Type-specific badge renderers
const MultipleChoiceBadges = React.memo<{
  question: MultipleChoiceQuestion;
  isSelected: boolean;
}>(({ question, isSelected }) => {
  const correctAnswersCount = useMemo(
    () => question.answerOptions.filter((option) => option.isCorrect).length,
    [question.answerOptions]
  );

  return (
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
        {question.allowMultipleSelections ? "Multi-Select" : "Single Select"}
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
});

const TrueFalseBadges = React.memo<{
  question: TrueFalseQuestion;
  isSelected: boolean;
}>(({ question, isSelected }) => (
  <Badge
    variant="outline"
    className={cn(
      "text-xs font-normal flex items-center gap-1 transition-colors duration-200",
      question.correctAnswer
        ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50"
        : "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
      isSelected && "ring-1 ring-current/20"
    )}
  >
    {question.correctAnswer ? (
      <CheckCircle className="h-3 w-3" />
    ) : (
      <XCircle className="h-3 w-3" />
    )}
    Answer: {question.correctAnswer ? "TRUE" : "FALSE"}
  </Badge>
));

const TypeAnswerBadges = React.memo<{
  question: TypeTheAnswerQuestion;
  isSelected: boolean;
}>(({ question, isSelected }) => (
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
      Pattern: "{question.correctAnswer}"
    </Badge>
    {question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-normal transition-colors duration-200",
          isSelected
            ? "border-blue-300 dark:border-blue-600/50 text-blue-700 dark:text-blue-300"
            : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
        )}
      >
        {question.acceptableAnswers.length} acceptable
      </Badge>
    )}
  </>
));

const ImageBadge = React.memo<{ isSelected: boolean }>(({ isSelected }) => (
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
    <span className="text-blue-600 dark:text-blue-400 text-xs">Image</span>
  </Badge>
));

const SelectionStatusIndicator = React.memo<{
  statusText: string;
  isPermanentlySelected: boolean;
  isQuestionModalOpen: boolean;
}>(({ statusText, isPermanentlySelected, isQuestionModalOpen }) => (
  <div className="mt-3 flex items-center gap-2">
    <div
      className={cn(
        "h-px flex-1",
        isPermanentlySelected && isQuestionModalOpen
          ? "bg-green-200 dark:bg-green-800/50"
          : "bg-blue-200 dark:bg-blue-800/50"
      )}
    />
    <span
      className={cn(
        "text-xs font-medium px-2 py-1 rounded-full",
        isPermanentlySelected && isQuestionModalOpen
          ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
          : "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"
      )}
    >
      {statusText}
    </span>
    <div
      className={cn(
        "h-px flex-1",
        isPermanentlySelected && isQuestionModalOpen
          ? "bg-green-200 dark:bg-green-800/50"
          : "bg-blue-200 dark:bg-blue-800/50"
      )}
    />
  </div>
));

export const CommonSelectQuestionCard: React.FC<CommonSelectQuestionCard> = ({
  question,
  selectionDisabled: externalSelectionDisabled = false,
}) => {
  const {
    addToTempSelection,
    removeFromTempSelection,
    isTempSelected: isQuestionTempSelectedInContext,
    isQuestionModalOpen,
    tempSelectedQuestions,
    isQuestionSelected,
    removeQuestionFromQuiz,
  } = useQuiz();

  // Memoized computed values
  const selectionState = useMemo(() => {
    const isPermanentlySelected = isQuestionSelected(question.id);
    const isCurrentCardTempSelected = isQuestionTempSelectedInContext(
      question.id
    );
    const isSelected = isQuestionModalOpen
      ? isCurrentCardTempSelected
      : isPermanentlySelected;

    const currentSelectionCount = isQuestionModalOpen
      ? tempSelectedQuestions.length
      : 0;
    const quizSelectionLimitReached =
      currentSelectionCount >= MAX_SELECTED_QUESTIONS && !isSelected;
    const alreadyInQuizAndModalOpen =
      isQuestionModalOpen && isPermanentlySelected;

    const finalSelectionDisabled =
      externalSelectionDisabled ||
      quizSelectionLimitReached ||
      alreadyInQuizAndModalOpen;

    return {
      isPermanentlySelected,
      isCurrentCardTempSelected,
      isSelected,
      finalSelectionDisabled,
      alreadyInQuizAndModalOpen,
    };
  }, [
    question.id,
    isQuestionSelected,
    isQuestionTempSelectedInContext,
    isQuestionModalOpen,
    tempSelectedQuestions.length,
    externalSelectionDisabled,
  ]);

  const selectionStatusText = useMemo(() => {
    const { isPermanentlySelected, isCurrentCardTempSelected } = selectionState;

    if (isPermanentlySelected && isQuestionModalOpen) return "Already in Quiz";
    if (isPermanentlySelected && !isQuestionModalOpen) return "In Quiz";
    if (
      isCurrentCardTempSelected &&
      isQuestionModalOpen &&
      !isPermanentlySelected
    ) {
      return "To be Added";
    }
    return null;
  }, [selectionState, isQuestionModalOpen]);

  const cardStyling = useMemo(() => {
    const {
      isPermanentlySelected,
      isCurrentCardTempSelected,
      isSelected,
      finalSelectionDisabled,
      alreadyInQuizAndModalOpen,
    } = selectionState;

    const cardIsClickableForSelection =
      !finalSelectionDisabled && isQuestionModalOpen;
    const cardIsGenerallyDisabled =
      (finalSelectionDisabled && !isSelected && isQuestionModalOpen) ||
      (alreadyInQuizAndModalOpen && !isCurrentCardTempSelected);

    return {
      cardIsClickableForSelection,
      cardIsGenerallyDisabled,
      showSelectionBar:
        isSelected || (isPermanentlySelected && isQuestionModalOpen),
      selectionBarColor:
        isPermanentlySelected && isQuestionModalOpen
          ? "bg-green-500 dark:bg-green-400"
          : "bg-blue-500 dark:bg-blue-400",
    };
  }, [selectionState, isQuestionModalOpen]);

  // Event handlers
  const handleCheckboxChange = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();

      if (!isQuestionModalOpen || selectionState.finalSelectionDisabled) return;

      if (selectionState.isCurrentCardTempSelected) {
        removeFromTempSelection(question.id);
      } else {
        addToTempSelection(question);
      }
    },
    [
      isQuestionModalOpen,
      selectionState.finalSelectionDisabled,
      selectionState.isCurrentCardTempSelected,
      removeFromTempSelection,
      addToTempSelection,
      question,
    ]
  );

  const handleRemovePermanently = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (
        removeQuestionFromQuiz &&
        selectionState.isPermanentlySelected &&
        !isQuestionModalOpen
      ) {
        removeQuestionFromQuiz(question.id);
      }
    },
    [
      removeQuestionFromQuiz,
      selectionState.isPermanentlySelected,
      isQuestionModalOpen,
      question.id,
    ]
  );

  // Type-specific badges renderer
  const renderTypeSpecificBadges = useCallback(() => {
    switch (question.type) {
      case QuestionType.MultipleChoice:
        return (
          <MultipleChoiceBadges
            question={question as MultipleChoiceQuestion}
            isSelected={selectionState.isSelected}
          />
        );
      case QuestionType.TrueFalse:
        return (
          <TrueFalseBadges
            question={question as TrueFalseQuestion}
            isSelected={selectionState.isSelected}
          />
        );
      case QuestionType.TypeTheAnswer:
        return (
          <TypeAnswerBadges
            question={question as TypeTheAnswerQuestion}
            isSelected={selectionState.isSelected}
          />
        );
      default:
        return null;
    }
  }, [question, selectionState.isSelected]);

  const {
    isPermanentlySelected,
    isCurrentCardTempSelected,
    isSelected,
    finalSelectionDisabled,
  } = selectionState;

  const { cardIsGenerallyDisabled, showSelectionBar, selectionBarColor } =
    cardStyling;

  return (
    <Card
      className={cn(
        "mb-3 border shadow-md transition-all duration-200 hover:shadow-md relative overflow-hidden bg-white dark:bg-gray-900",
        isSelected
          ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800/50"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        cardIsGenerallyDisabled &&
          "opacity-50 cursor-not-allowed hover:shadow-sm",
        selectionState.alreadyInQuizAndModalOpen && "opacity-70"
      )}
    >
      {showSelectionBar && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            selectionBarColor
          )}
        />
      )}

      <CardHeader className="pb-3 pt-4 pl-6 pr-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Checkbox
              checked={
                isQuestionModalOpen
                  ? isPermanentlySelected || isCurrentCardTempSelected
                  : isPermanentlySelected
              }
              disabled={finalSelectionDisabled || !isQuestionModalOpen}
              onClick={handleCheckboxChange}
              className={cn(
                "mt-1 flex-shrink-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isPermanentlySelected && isQuestionModalOpen
                  ? "bg-green-500 border-green-500 text-white data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  : isSelected &&
                      "bg-blue-500 border-blue-500 text-white data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
              )}
              aria-label={`Select question ${question.id}`}
            />
            {(isQuestionModalOpen
              ? isPermanentlySelected || isCurrentCardTempSelected
              : isPermanentlySelected) && (
              <Check className="absolute top-1.5 left-0.5 h-3 w-3 text-white pointer-events-none" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <CardTitle
                className={cn(
                  "text-base leading-tight flex-1 pr-2 transition-colors duration-200",
                  isSelected || (isPermanentlySelected && isQuestionModalOpen)
                    ? "text-blue-900 dark:text-blue-100"
                    : "text-gray-900 dark:text-gray-100"
                )}
              >
                {question.text}
                {question.imageUrl && (
                  <ImageBadge
                    isSelected={
                      isSelected ||
                      (isPermanentlySelected && isQuestionModalOpen)
                    }
                  />
                )}
              </CardTitle>

              <div className="flex items-center gap-2 flex-shrink-0">
                <DifficultyBadge
                  difficulty={question.difficulty.level}
                  isSelected={
                    isSelected || (isPermanentlySelected && isQuestionModalOpen)
                  }
                />

                {isPermanentlySelected && !isQuestionModalOpen && (
                  <button
                    onClick={handleRemovePermanently}
                    className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800/30 text-red-500 dark:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    aria-label="Remove question from quiz"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge
                category={question.category.name}
                isSelected={isSelected}
              />
              <LanguageBadge
                language={question.language.language}
                isSelected={isSelected}
              />
              {renderTypeSpecificBadges()}
            </div>

            {selectionStatusText && (
              <SelectionStatusIndicator
                statusText={selectionStatusText}
                isPermanentlySelected={isPermanentlySelected}
                isQuestionModalOpen={isQuestionModalOpen}
              />
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default CommonSelectQuestionCard;
