import React from "react";
import { CardContent } from "@/components/ui";
import { Edit3 } from "lucide-react"; // Added Info
import { NewSmallQuestionCardProps } from "../../existing-small-question-card-components/shared/types";
import { NewTypeTheAnswerQuestion } from "../../../../types";
import { truncateText } from "../../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { SmallBaseQuestionCard } from "../../existing-small-question-card-components/shared/small-base-question-card";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { useQuiz } from "../../../../Quiz-questions-context";
import { NewSmallQuestionHeader } from "../shared/new-small-question-header";
import { NewSmallTypeAnswerDisplay } from "./new-small-type-the-asnwer-display";
import { ErrorIndicator } from "../new-small-multiple-choice-card/new-small-multiple-choice-question-card";

export const NewSmallTypeTheAnswerCard: React.FC<NewSmallQuestionCardProps> = ({
  question,
}) => {
  const { displayQuestion, getQuestionErrors } = useQuiz();
  const newTtaQuestion = question as NewTypeTheAnswerQuestion;
  const truncatedText = truncateText(newTtaQuestion.text, 50);
  const isSelected = displayQuestion?.id === newTtaQuestion.id;
  const hasErrors = getQuestionErrors(newTtaQuestion.id).length > 0;
  return (
    <div className="relative">
      <SmallBaseQuestionCard
        question={question}
        borderColor={hasErrors ? "border-red-500" : "border-orange-500"}
        gradientColor={
          hasErrors
            ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20"
            : "bg-gradient-to-r from-background to-orange-500/30"
        }
      >
        <NewSmallQuestionHeader
          icon={<Edit3 size={12} />}
          questionType="Type Answer"
          badgeColor={
            hasErrors
              ? "bg-red-100 text-red-600"
              : "bg-orange-100 text-orange-600"
          }
          questionId={newTtaQuestion.id}
          className={
            isSelected
              ? hasErrors
                ? "bg-gradient-to-r from-red-50 to-red-200/50 dark:from-red-950/20 dark:to-red-900/30"
                : "bg-gradient-to-r from-background to-orange-500/30"
              : undefined
          }
        />

        <CardContent className="p-3">
          <QuestionBubble text={truncatedText} />
          <NewSmallTypeAnswerDisplay
            question={newTtaQuestion}
            truncateText={truncateText}
          />
        </CardContent>
      </SmallBaseQuestionCard>

      <ErrorIndicator questionId={newTtaQuestion.id} />
    </div>
  );
};
