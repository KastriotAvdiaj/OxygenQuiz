import React from "react";
import { CardContent } from "@/components/ui";
import { CheckCircle } from "lucide-react"; // Added Info
import { NewSmallQuestionCardProps } from "../../existing-small-question-card-components/shared/types";
import { NewTrueFalseQuestion } from "../../../../types";
import { truncateText } from "../../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { useQuiz } from "../../../../Quiz-questions-context";
import { SmallBaseQuestionCard } from "../../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionHeader } from "../shared/new-small-question-header";
import { NewTrueFalseOptions } from "./new-small-true-false-question-options";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { ErrorIndicator } from "../new-small-multiple-choice-card/new-small-multiple-choice-question-card";

export const NewSmallTrueFalseCard: React.FC<NewSmallQuestionCardProps> = ({
  question,
}) => {
  const { displayQuestion, getQuestionErrors } = useQuiz();
  const newTfQuestion = question as NewTrueFalseQuestion;
  const truncatedText = truncateText(newTfQuestion.text, 50);
  const isSelected = displayQuestion?.id === newTfQuestion.id;
  const hasErrors = getQuestionErrors(newTfQuestion.id).length > 0;

  return (
    <div className="relative">
      <SmallBaseQuestionCard
        question={question}
        borderColor={hasErrors ? "border-red-500" : "border-purple-500"}
        gradientColor={
          hasErrors
            ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20"
            : "bg-gradient-to-r from-background to-purple-500/30"
        }
      >
        <NewSmallQuestionHeader
          icon={<CheckCircle size={12} />}
          questionType="True/False"
          badgeColor={
            hasErrors
              ? "bg-red-100 text-red-600"
              : "bg-purple-100 text-purple-600"
          }
          questionId={newTfQuestion.id}
          className={
            isSelected
              ? hasErrors
                ? "bg-gradient-to-r from-red-50 to-red-200/50 dark:from-red-950/20 dark:to-red-900/30"
                : "bg-gradient-to-r from-background to-purple-500/30"
              : undefined
          }
        />

        <CardContent className="p-3">
          <QuestionBubble text={truncatedText} />
          <NewTrueFalseOptions question={newTfQuestion} />
        </CardContent>
      </SmallBaseQuestionCard>

      {/* Error Indicator */}
      <ErrorIndicator questionId={newTfQuestion.id} />
    </div>
  );
};
