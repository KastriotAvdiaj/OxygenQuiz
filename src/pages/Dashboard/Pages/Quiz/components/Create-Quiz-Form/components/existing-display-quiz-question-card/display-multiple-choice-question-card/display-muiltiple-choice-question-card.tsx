import React from "react";
import { Input } from "@/components/ui/form";
import { MultipleChoiceQuestion, QuestionType } from "@/types/ApiTypes";
import {
  BaseQuestionCard,
  ExistingQuestionCardProps,
} from "../display-base-quiz-question-card";
import { QuestionImagePreview } from "../display-quiz-question-image-preview";
import { MultipleChoiceAnswers } from "./multiple-choice-answers";
import { QuestionMetadata } from "../display-quiz-question-metadata";
import { QuestionFooter } from "../display-quiz-question-card-footer";

export const getQuestionTypeStyles = (type: QuestionType) => {
  switch (type) {
    case QuestionType.MultipleChoice:
      return {
        borderColor: "border-primary/80",
        backgroundColor: "bg-primary/5",
        previewBorderColor: "border-primary",
      };
    case QuestionType.TrueFalse:
      return {
        borderColor: "border-purple-500/80",
        backgroundColor: "bg-purple-300/10",
        previewBorderColor: "border-purple-500",
      };
    case QuestionType.TypeTheAnswer:
      return {
        borderColor: "border-orange-500/80",
        backgroundColor: "bg-orange-200/10",
        previewBorderColor: "border-orange-500",
      };
    default:
      return {
        borderColor: "border-primary/80",
        backgroundColor: "bg-primary/5",
        previewBorderColor: "border-primary",
      };
  }
};

export const MultipleChoiceCard: React.FC<ExistingQuestionCardProps> = (
  props
) => {
  const question = props.question as MultipleChoiceQuestion;
  const styles = getQuestionTypeStyles(question.type);

  return (
    <BaseQuestionCard
      {...props}
      borderColor={styles.borderColor}
      backgroundColor={styles.backgroundColor}
    >
      <Input
        variant="display"
        value={question.text || ""}
        className="my-8 !text-[1.5rem] py-8"
      />

      {question.imageUrl && (
        <QuestionImagePreview
          imageUrl={question.imageUrl}
          previewBorderColor={styles.previewBorderColor}
        />
      )}

      <MultipleChoiceAnswers question={question} />
      <QuestionMetadata question={question} />
      <QuestionFooter question={question} />
    </BaseQuestionCard>
  );
};
