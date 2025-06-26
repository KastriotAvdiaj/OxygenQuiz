import React from "react";
import { QuestionType } from "@/types/question-types";
import { MultipleChoiceCard } from "./display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { TrueFalseCard } from "./display-true-false-question-card/display-true-false-question-card";
import { TypeTheAnswerCard } from "./display-type-the-answer-question-card/display-type-the-asnwer-question-card";
import { ExistingQuestionCardProps } from "./display-base-quiz-question-card";

export const ExistingQuestionCard: React.FC<ExistingQuestionCardProps> = (
  props
) => {
  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return <MultipleChoiceCard {...props} />;
    case QuestionType.TrueFalse:
      return <TrueFalseCard {...props} />;
    case QuestionType.TypeTheAnswer:
      return <TypeTheAnswerCard {...props} />;
    default:
      return null;
  }
};
