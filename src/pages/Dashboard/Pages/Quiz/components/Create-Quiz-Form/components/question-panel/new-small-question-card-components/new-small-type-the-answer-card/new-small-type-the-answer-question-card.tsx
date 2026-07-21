import React from "react";
import { CardContent } from "@/components/ui";
import { QuestionType } from "@/types/question-types";
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
  const { getQuestionErrors } = useQuiz();
  const newTtaQuestion = question as NewTypeTheAnswerQuestion;
  const truncatedText = truncateText(newTtaQuestion.text, 50);
  const hasErrors = getQuestionErrors(newTtaQuestion.id).length > 0;
  return (
    <div className="relative">
      <SmallBaseQuestionCard
        question={question}
        type={QuestionType.TypeTheAnswer}
        hasErrors={hasErrors}
      >
        <NewSmallQuestionHeader
          type={QuestionType.TypeTheAnswer}
          questionId={newTtaQuestion.id}
          hasErrors={hasErrors}
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
