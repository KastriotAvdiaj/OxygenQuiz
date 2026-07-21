import React from "react";
import { CardContent } from "@/components/ui/card";
import { TrueFalseQuestion, QuestionType } from "@/types/question-types";
import { ExistingSmallQuestionCardProps } from "../shared/types";
import { SmallBaseQuestionCard } from "../shared/small-base-question-card";
import { SmallQuestionHeader } from "../shared/small-question-header";
import { TrueFalseOptions } from "./small-true-false-question-card-options";
import { SmallQuestionFooter } from "../shared/small-question-footer";
import { QuestionBubble } from "../../shared/question-text-bubble";

export const truncateText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text || "";

export const ExistingSmallTrueFalseCard: React.FC<
  ExistingSmallQuestionCardProps
> = ({ question }) => {
  const tfQuestion = question as TrueFalseQuestion;
  const truncatedText = truncateText(tfQuestion.text, 50);

  return (
    <SmallBaseQuestionCard question={question} type={QuestionType.TrueFalse}>
      <SmallQuestionHeader
        type={QuestionType.TrueFalse}
        questionId={tfQuestion.id}
      />

      <CardContent className="p-3">
        <QuestionBubble text={truncatedText} />
        <TrueFalseOptions question={tfQuestion} />
        <SmallQuestionFooter
          categoryName={tfQuestion.category.name}
          difficultyLevel={question.difficulty.level}
        />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
