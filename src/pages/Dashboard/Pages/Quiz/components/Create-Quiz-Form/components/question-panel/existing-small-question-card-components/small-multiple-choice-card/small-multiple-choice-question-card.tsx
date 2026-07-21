import React from "react";
import { CardContent } from "@/components/ui/card";
import { MultipleChoiceQuestion, QuestionType } from "@/types/question-types";
import { ExistingSmallQuestionCardProps } from "../shared/types";
import { SmallQuestionHeader } from "../shared/small-question-header";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { SmallQuestionFooter } from "../shared/small-question-footer";
import { MultipleChoiceOptions } from "./small-multiple-choice-question-options";
import { SmallBaseQuestionCard } from "../shared/small-base-question-card";

const truncateText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text || "";

export const ExistingSmallMultipleChoiceCard: React.FC<
  ExistingSmallQuestionCardProps
> = ({ question }) => {
  const mcQuestion = question as MultipleChoiceQuestion;
  const truncatedText = truncateText(mcQuestion.text, 50);

  return (
    <SmallBaseQuestionCard question={question} type={QuestionType.MultipleChoice}>
      <SmallQuestionHeader
        type={QuestionType.MultipleChoice}
        questionId={mcQuestion.id}
      />

      <CardContent className="p-3">
        <QuestionBubble text={truncatedText} />
        <MultipleChoiceOptions
          question={mcQuestion}
          truncateText={truncateText}
        />
        <SmallQuestionFooter
          categoryName={mcQuestion.category.name}
          difficultyLevel={question.difficulty.level}
          extraBadges={mcQuestion.allowMultipleSelections ? [] : []}
        />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
