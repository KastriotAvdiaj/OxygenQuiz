import React from "react";
import { QuestionType } from "@/types/question-types";
import { isSavedShape } from "../../edit-copy";
import { useQuiz } from "../../Quiz-questions-context";
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

/**
 * The builder list's card, with *Pasted — check* above it for a question that came in through
 * Paste questions this session (components/paste-questions) — nobody has looked at it yet.
 */
export const SmallQuestionCard: React.FC<SmallQuestionCardProps> = (props) => {
  const { isPasted } = useQuiz();
  const card = <SmallQuestionCardBody {...props} />;
  if (!isPasted(props.question.id)) return card;
  return (
    <div className="flex flex-col gap-1">
      <span className="self-start rounded-sm border border-dashed border-foreground/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        Pasted — check
      </span>
      {card}
    </div>
  );
};

const SmallQuestionCardBody: React.FC<SmallQuestionCardProps> = (props) => {
  // By shape, not id sign: a saved question being edited in place keeps its positive id but is
  // draft-shaped, and the "existing" cards read lookups as objects it no longer has (edit-copy.ts).
  const isExisting = isSavedShape(props.question);

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
