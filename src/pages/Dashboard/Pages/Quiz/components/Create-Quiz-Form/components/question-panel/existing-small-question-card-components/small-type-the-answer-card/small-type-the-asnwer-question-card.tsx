import React from "react";
import { CardContent } from "@/components/ui/card";
import { TypeTheAnswerQuestion, QuestionType } from "@/types/question-types";
import { ExistingSmallQuestionCardProps } from "../shared/types";
import { SmallTypeAnswerDisplay } from "./small-type-the-asnwer-quesiton-display";
import { SmallBaseQuestionCard } from "../shared/small-base-question-card";
import { SmallQuestionHeader } from "../shared/small-question-header";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { SmallQuestionFooter } from "../shared/small-question-footer";

const truncateText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text || "";

export const ExistingSmallTypeTheAnswerCard: React.FC<
  ExistingSmallQuestionCardProps
> = ({ question }) => {
  const ttaQuestion = question as TypeTheAnswerQuestion;
  const truncatedText = truncateText(ttaQuestion.text, 50);

  return (
    <SmallBaseQuestionCard question={question} type={QuestionType.TypeTheAnswer}>
      <SmallQuestionHeader
        type={QuestionType.TypeTheAnswer}
        questionId={ttaQuestion.id}
      />

      <CardContent className="p-3">
        <QuestionBubble text={truncatedText} />
        <SmallTypeAnswerDisplay
          question={ttaQuestion}
          truncateText={truncateText}
        />
        <SmallQuestionFooter
          categoryName={ttaQuestion.category.name}
          difficultyLevel={question.difficulty.level}
        />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
