import React from "react";
import { QuestionType } from "@/types/ApiTypes";
import { SmallMultipleChoiceCard } from "./small-multiple-choice-card/small-multiple-choice-question-card";
import { SmallTrueFalseCard } from "./small-true-false-card/small-true-false-question-card";
import { SmallTypeTheAnswerCard } from "./small-type-the-answer-card/small-type-the-asnwer-question-card";
import { ExistingSmallQuestionCardProps } from "./shared/types";
export const SmallQuestionCard: React.FC<ExistingSmallQuestionCardProps> = (
  props
) => {
  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return <SmallMultipleChoiceCard {...props} />;
    case QuestionType.TrueFalse:
      return <SmallTrueFalseCard {...props} />;
    case QuestionType.TypeTheAnswer:
      return <SmallTypeTheAnswerCard {...props} />;
    default:
      return null;
  }
};
