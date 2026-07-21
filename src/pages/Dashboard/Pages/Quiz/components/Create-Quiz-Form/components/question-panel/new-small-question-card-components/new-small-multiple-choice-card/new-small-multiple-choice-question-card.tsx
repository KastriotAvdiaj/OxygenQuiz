import { CardContent } from "@/components/ui";
import { QuestionType } from "@/types/question-types";
import { NewMultipleChoiceQuestion } from "../../../../types";
import { SmallBaseQuestionCard } from "../../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionCardProps } from "../../existing-small-question-card-components/shared/types";
import { truncateText } from "../../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { NewSmallQuestionHeader } from "../shared/new-small-question-header";
import { Info } from "lucide-react";
import { useQuiz } from "../../../../Quiz-questions-context";
import { NewMultipleChoiceOptions } from "./new-small-multiple-choice-question-options";

// Error indicator component for small cards
export const ErrorIndicator: React.FC<{
  questionId: number;
  className?: string;
}> = ({ questionId, className = "" }) => {
  const { getQuestionErrors } = useQuiz();
  const errors = getQuestionErrors(questionId);

  if (errors.length === 0) return null;

  return (
    <div
      className={`absolute -top-2 -left-2 z-10 ${className}`}
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
  const { getQuestionErrors } = useQuiz();

  const newMcQuestion = question as NewMultipleChoiceQuestion;
  const truncatedText = truncateText(newMcQuestion.text, 50);
  const hasErrors = getQuestionErrors(newMcQuestion.id).length > 0;

  return (
    <div className="relative">
      <SmallBaseQuestionCard
        question={question}
        type={QuestionType.MultipleChoice}
        hasErrors={hasErrors}
      >
        <NewSmallQuestionHeader
          type={QuestionType.MultipleChoice}
          questionId={newMcQuestion.id}
          hasErrors={hasErrors}
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

