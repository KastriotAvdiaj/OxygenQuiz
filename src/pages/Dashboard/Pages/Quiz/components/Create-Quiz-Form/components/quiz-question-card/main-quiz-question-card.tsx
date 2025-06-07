import React from "react";
import { QuestionType } from "@/types/ApiTypes";
import { MultipleChoiceCard } from "./multiple-choice-question-card/quiz-muiltiple-choice-question-card";
import { TrueFalseCard } from "./true-false-question-card/true-false-question-card";
import { TypeTheAnswerCard } from "./type-the-answer-question-card/type-the-asnwer-question-card";
import { QuestionCardProps } from "./quiz-base-question-card";

export const QuestionCard: React.FC<QuestionCardProps> = (props) => {
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
