import React from "react";
import { Input } from "@/components/ui/form";
import { MultipleChoiceQuestion } from "@/types/question-types";
import {
  BaseQuestionCard,
  ExistingQuestionCardProps,
} from "../display-base-quiz-question-card";
import { QuestionImagePreview } from "../display-quiz-question-image-preview";
import { MultipleChoiceAnswers } from "./multiple-choice-answers";
import { QuestionMetadata } from "../display-quiz-question-metadata";
import { QuestionFooter } from "../display-quiz-question-card-footer";

// Type colors live in one place — see question-type-theme.ts. Imported for local use and
// re-exported so the many cards that already import it from this module keep working.
import { getQuestionTypeStyles } from "../../../question-type-theme";
export { getQuestionTypeStyles };

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
