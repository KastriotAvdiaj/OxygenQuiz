import { CardContent } from "@/components/ui";
import { NewMultipleChoiceQuestion } from "../../../../types";
import { SmallBaseQuestionCard } from "../../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionCardProps } from "../../existing-small-question-card-components/shared/types";
import { truncateText } from "../../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { NewSmallQuestionHeader } from "../shared/new-small-question-header";
import { List, Info } from "lucide-react";
import { useQuiz } from "../../../../Quiz-questions-context";
import { NewMultipleChoiceOptions } from "./new-small-multiple-choice-question-options";

// Error indicator component for small cards
const ErrorIndicator: React.FC<{
  questionId: number;
  className?: string;
}> = ({ questionId, className = "" }) => {
  const { getQuestionErrors } = useQuiz();
  const errors = getQuestionErrors(questionId);

  if (errors.length === 0) return null;

  return (
    <div
      className={`absolute -top-2 -right-2 z-10 ${className}`}
      title={`${errors.length} validation error${errors.length > 1 ? "s" : ""}`}
    >
      <div className="relative">
        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
          <Info className="w-3 h-3 text-white" />
        </div>
        {errors.length > 1 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {errors.length}
          </div>
        )}
      </div>
    </div>
  );
};

export const NewSmallMultipleChoiceCard: React.FC<
  NewSmallQuestionCardProps
> = ({ question }) => {
  const { displayQuestion, getQuestionErrors } = useQuiz();

  const newMcQuestion = question as NewMultipleChoiceQuestion;
  const truncatedText = truncateText(newMcQuestion.text, 50);
  const isSelected = displayQuestion?.id === newMcQuestion.id;
  const hasErrors = getQuestionErrors(newMcQuestion.id).length > 0;

  return (
    <div className="relative">
      <SmallBaseQuestionCard
        question={question}
        borderColor={hasErrors ? "border-red-500" : "border-primary/80"}
        gradientColor={
          hasErrors
            ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20"
            : "bg-gradient-to-r from-background to-primary/20"
        }
      >
        <NewSmallQuestionHeader
          icon={<List size={12} />}
          questionType="Multiple Choice"
          badgeColor={
            hasErrors ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          }
          questionId={newMcQuestion.id}
          className={
            isSelected
              ? hasErrors
                ? "bg-gradient-to-r from-red-50 to-red-200/50 dark:from-red-950/20 dark:to-red-900/30"
                : "bg-gradient-to-r from-background to-primary/30"
              : undefined
          }
        />
        <CardContent>
          <QuestionBubble text={truncatedText} />
          <NewMultipleChoiceOptions
            question={newMcQuestion}
            truncateText={truncateText}
          />
        </CardContent>
      </SmallBaseQuestionCard>

      {/* Error Indicator */}
      <ErrorIndicator questionId={newMcQuestion.id} />
    </div>
  );
};

