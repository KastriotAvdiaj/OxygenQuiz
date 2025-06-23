import React from "react";
import { CardContent } from "@/components/ui/card";
import { List } from "lucide-react";
import { MultipleChoiceQuestion } from "@/types/ApiTypes";
import { ExistingSmallQuestionCardProps } from "../shared/types";
import { useQuiz } from "../../../../Quiz-questions-context";
import { SmallQuestionHeader } from "../shared/small-question-header";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { SmallQuestionFooter } from "../shared/small-question-footer";
import { MultipleChoiceOptions } from "./small-multiple-choice-question-options";
import { SmallBaseQuestionCard } from "../shared/small-base-question-card";

const truncateText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text || "";

export const ExistingSmallMultipleChoiceCard: React.FC<
  ExistingSmallQuestionCardProps
> = ({ question, onRemove, isActive = false }) => {
  const { displayQuestion } = useQuiz();
  const mcQuestion = question as MultipleChoiceQuestion;
  const truncatedText = truncateText(mcQuestion.text, 50);
  const isPrivate = mcQuestion.visibility === "private";
  const isSelected = displayQuestion?.id === mcQuestion.id;

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-primary/80"
      gradientColor="bg-gradient-to-r from-background to-primary/20"
      onRemove={onRemove}
    >
      <SmallQuestionHeader
        icon={<List size={12} />}
        isPrivate={isPrivate}
        questionType="Multiple Choice"
        badgeColor="bg-blue-100 text-blue-600"
        isActive={isActive}
        onRemove={onRemove}
        className={
          isSelected ? "bg-gradient-to-r from-background to-primary/20" : ""
        }
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
