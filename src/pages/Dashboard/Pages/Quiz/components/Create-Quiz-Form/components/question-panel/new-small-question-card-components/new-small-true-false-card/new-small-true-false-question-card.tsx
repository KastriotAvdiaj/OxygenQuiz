import React from "react";
import { CardContent } from "@/components/ui";
import { QuestionType } from "@/types/question-types";
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
  const { getQuestionErrors } = useQuiz();
  const newTfQuestion = question as NewTrueFalseQuestion;
  const truncatedText = truncateText(newTfQuestion.text, 50);
  const hasErrors = getQuestionErrors(newTfQuestion.id).length > 0;

  return (
    <div className="relative">
      <SmallBaseQuestionCard
        question={question}
        type={QuestionType.TrueFalse}
        hasErrors={hasErrors}
      >
        <NewSmallQuestionHeader
          type={QuestionType.TrueFalse}
          questionId={newTfQuestion.id}
          hasErrors={hasErrors}
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
