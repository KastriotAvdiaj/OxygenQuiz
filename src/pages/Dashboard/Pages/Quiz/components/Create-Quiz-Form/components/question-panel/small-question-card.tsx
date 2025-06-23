import React from "react";
import { QuestionType } from "@/types/ApiTypes";
import {
  ExistingSmallQuestionCardProps,
  NewSmallQuestionCardProps,
  SmallQuestionCardProps,
} from "./existing-small-question-card-components/shared/types";
import { ExistingSmallMultipleChoiceCard } from "./existing-small-question-card-components/small-multiple-choice-card/small-multiple-choice-question-card";
import { NewSmallMultipleChoiceCard } from "./new-small-question-card-components/new-small-multiple-choice-card/new-small-multiple-choice-question-card";
import { ExistingSmallTrueFalseCard } from "./existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { NewSmallTrueFalseCard } from "./new-small-question-card-components/new-small-true-false-card/new-small-true-false-question-card";
import { ExistingSmallTypeTheAnswerCard } from "./existing-small-question-card-components/small-type-the-answer-card/small-type-the-asnwer-question-card";
import { NewSmallTypeTheAnswerCard } from "./new-small-question-card-components/new-small-type-the-answer-card/new-small-type-the-answer-question-card";
// Import new question card components

// type SmallQuestionCardProps =
//   | ExistingSmallQuestionCardProps
//   | NewSmallQuestionCardProps;

export const SmallQuestionCard: React.FC<SmallQuestionCardProps> = (props) => {
  const isExisting = props.question.id > 0;

  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return isExisting ? (
        <ExistingSmallMultipleChoiceCard
          {...(props as ExistingSmallQuestionCardProps)}
        />
      ) : (
        <NewSmallMultipleChoiceCard {...(props as NewSmallQuestionCardProps)} />
      );

    case QuestionType.TrueFalse:
      return isExisting ? (
        <ExistingSmallTrueFalseCard
          {...(props as ExistingSmallQuestionCardProps)}
        />
      ) : (
        <NewSmallTrueFalseCard {...(props as NewSmallQuestionCardProps)} />
      );

    case QuestionType.TypeTheAnswer:
      return isExisting ? (
        <ExistingSmallTypeTheAnswerCard
          {...(props as ExistingSmallQuestionCardProps)}
        />
      ) : (
        <NewSmallTypeTheAnswerCard {...(props as NewSmallQuestionCardProps)} />
      );

    default:
      return null;
  }
};
