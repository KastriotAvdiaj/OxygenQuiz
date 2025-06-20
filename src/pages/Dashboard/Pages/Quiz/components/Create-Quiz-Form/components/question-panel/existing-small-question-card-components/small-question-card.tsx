import React from "react";
import { QuestionType } from "@/types/ApiTypes";
import { ExistingSmallMultipleChoiceCard } from "./small-multiple-choice-card/small-multiple-choice-question-card";
import { ExistingSmallTrueFalseCard } from "./small-true-false-card/small-true-false-question-card";
import { ExistingSmallTypeTheAnswerCard } from "./small-type-the-answer-card/small-type-the-asnwer-question-card";
import { ExistingSmallQuestionCardProps } from "./shared/types";
export const SmallQuestionCard: React.FC<ExistingSmallQuestionCardProps> = (
  props
) => {
  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return <ExistingSmallMultipleChoiceCard {...props} />;
    case QuestionType.TrueFalse:
      return <ExistingSmallTrueFalseCard {...props} />;
    case QuestionType.TypeTheAnswer:
      return <ExistingSmallTypeTheAnswerCard {...props} />;
    default:
      return null;
  }
};
