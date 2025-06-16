import React from "react";
import { Input } from "@/components/ui/form";
import { TrueFalseQuestion } from "@/types/ApiTypes";
import {
  BaseQuestionCard,
  ExistingQuestionCardProps,
} from "../base-quiz-question-card";
import { getQuestionTypeStyles } from "../multiple-choice-question-card/quiz-muiltiple-choice-question-card";
import { QuestionImagePreview } from "../quiz-question-image-preview";
import { TrueFalseAnswers } from "./true-false-answer";
import { QuestionMetadata } from "../quiz-question-metadata";
import { QuestionFooter } from "../quiz-question-card-footer";

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
        questionType="true-false"
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
