import React from "react";
import { Input, QuestionType } from "@/components/ui/form";
import { TrueFalseQuestion } from "@/types/ApiTypes";
import {
  BaseQuestionCard,
  ExistingQuestionCardProps,
} from "../display-base-quiz-question-card";
import { getQuestionTypeStyles } from "../display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionImagePreview } from "../display-quiz-question-image-preview";
import { TrueFalseAnswers } from "./true-false-answer";
import { QuestionMetadata } from "../display-quiz-question-metadata";
import { QuestionFooter } from "../display-quiz-question-card-footer";

export const TrueFalseCard: React.FC<ExistingQuestionCardProps> = (props) => {
  const question = props.question as TrueFalseQuestion;
  const styles = getQuestionTypeStyles(question.type);

  return (
    <BaseQuestionCard
      {...props}
      borderColor={styles.borderColor}
      backgroundColor={styles.backgroundColor}
    >
      <Input
        variant="display"
        questionType={QuestionType.TrueFalse}
        value={question.text || ""}
        className="my-8 !text-[1.5rem] py-8"
      />

      {question.imageUrl && (
        <QuestionImagePreview
          imageUrl={question.imageUrl}
          previewBorderColor={styles.previewBorderColor}
        />
      )}

      <TrueFalseAnswers question={question} />
      <QuestionMetadata
        question={question}
        backgroundColor="bg-purple-200/50 dark:bg-purple-900/30 shadow-md"
      />
      <QuestionFooter question={question} />
    </BaseQuestionCard>
  );
};
