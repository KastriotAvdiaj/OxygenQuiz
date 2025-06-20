import React from "react";
import { CardContent } from "@/components/ui/card";
import { Edit3 } from "lucide-react";
import { TypeTheAnswerQuestion } from "@/types/ApiTypes";
import { ExistingSmallQuestionCardProps } from "../shared/types";
import { useQuiz } from "../../../../Quiz-questions-context";
import { SmallTypeAnswerDisplay } from "./small-type-the-asnwer-quesiton-display";
import { SmallBaseQuestionCard } from "../shared/small-base-question-card";
import { SmallQuestionHeader } from "../shared/small-question-header";
import { QuestionBubble } from "../shared/question-text-bubble";
import { SmallQuestionFooter } from "../shared/small-question-footer";

const truncateText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text || "";

export const ExistingSmallTypeTheAnswerCard: React.FC<
  ExistingSmallQuestionCardProps
> = ({ question, onRemove }) => {
  const { displayQuestion } = useQuiz();
  const ttaQuestion = question as TypeTheAnswerQuestion;
  const truncatedText = truncateText(ttaQuestion.text, 50);
  const isPrivate = ttaQuestion.visibility === "private";
  const isSelected = displayQuestion?.id === ttaQuestion.id;

  const extraBadges = [];
  if (ttaQuestion.isCaseSensitive || ttaQuestion.allowPartialMatch) {
    extraBadges.push(
      <SmallTypeAnswerDisplay
        key="type-badges"
        question={ttaQuestion}
        truncateText={truncateText}
      />
    );
  }

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-orange-500"
      gradientColor="bg-gradient-to-r from-background to-orange-500/30"
      onRemove={onRemove}
    >
      <SmallQuestionHeader
        icon={<Edit3 size={12} />}
        isPrivate={isPrivate}
        questionType="Type Answer"
        badgeColor="bg-orange-100 text-orange-600"
        onRemove={onRemove}
        className={
          isSelected
            ? "bg-gradient-to-r from-background to-orange-500/30"
            : undefined
        }
      />

      <CardContent className="p-3">
        <QuestionBubble text={truncatedText} />
        <SmallTypeAnswerDisplay
          question={ttaQuestion}
          truncateText={truncateText}
        />
        <SmallQuestionFooter
          categoryName={ttaQuestion.category.name}
          difficultyLevel={question.difficulty.level}
        />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
