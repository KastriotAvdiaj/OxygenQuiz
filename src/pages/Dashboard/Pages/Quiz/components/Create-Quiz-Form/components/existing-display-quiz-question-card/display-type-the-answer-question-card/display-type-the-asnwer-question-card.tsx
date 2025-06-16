import React from "react";
import { Input, QuestionType } from "@/components/ui/form";
import { TypeTheAnswerQuestion } from "@/types/ApiTypes";
import {
  BaseQuestionCard,
  ExistingQuestionCardProps,
} from "../display-base-quiz-question-card";
import { getQuestionTypeStyles } from "../display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionImagePreview } from "../display-quiz-question-image-preview";
import { TypeTheAnswerDisplay } from "./type-the-asnwer-display";
import { QuestionMetadata } from "../display-quiz-question-metadata";
import { QuestionFooter } from "../display-quiz-question-card-footer";

export const TypeTheAnswerCard: React.FC<ExistingQuestionCardProps> = (
  props
) => {
  const question = props.question as TypeTheAnswerQuestion;
  const styles = getQuestionTypeStyles(question.type);

  return (
    <BaseQuestionCard
      {...props}
      borderColor={styles.borderColor}
      backgroundColor={styles.backgroundColor}
    >
      <Input
        variant="display"
        questionType={QuestionType.TypeTheAnswer}
        value={question.text || ""}
        className="my-8 !text-[1.5rem] py-8"
      />

      {question.imageUrl && (
        <QuestionImagePreview
          imageUrl={question.imageUrl}
          previewBorderColor={styles.previewBorderColor}
        />
      )}

      <TypeTheAnswerDisplay question={question} />
      <QuestionMetadata question={question} />
      <QuestionFooter question={question} />
    </BaseQuestionCard>
  );
};
