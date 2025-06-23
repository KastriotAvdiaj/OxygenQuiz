import React from "react";
import { CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { TrueFalseQuestion } from "@/types/ApiTypes";
import { useQuiz } from "../../../../Quiz-questions-context";
import { ExistingSmallQuestionCardProps } from "../shared/types";
import { SmallBaseQuestionCard } from "../shared/small-base-question-card";
import { SmallQuestionHeader } from "../shared/small-question-header";
import { TrueFalseOptions } from "./small-true-false-question-card-options";
import { SmallQuestionFooter } from "../shared/small-question-footer";
import { QuestionBubble } from "../../shared/question-text-bubble";

export const truncateText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text || "";

export const ExistingSmallTrueFalseCard: React.FC<
  ExistingSmallQuestionCardProps
> = ({ question }) => {
  const { displayQuestion } = useQuiz();
  const tfQuestion = question as TrueFalseQuestion;
  const truncatedText = truncateText(tfQuestion.text, 50);
  const isPrivate = tfQuestion.visibility === "private";
  const isSelected = displayQuestion?.id === tfQuestion.id;

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-purple-500"
      gradientColor="bg-gradient-to-r from-background to-purple-500/30"
    >
      <SmallQuestionHeader
        icon={<CheckCircle size={12} />}
        isPrivate={isPrivate}
        questionType="True/False"
        badgeColor="bg-purple-100 text-purple-600"
        questionId={tfQuestion.id}
        className={
          isSelected
            ? "bg-gradient-to-r from-background to-purple-500/30"
            : undefined
        }
      />

      <CardContent className="p-3">
        <QuestionBubble text={truncatedText} />
        <TrueFalseOptions question={tfQuestion} />
        <SmallQuestionFooter
          categoryName={tfQuestion.category.name}
          difficultyLevel={question.difficulty.level}
        />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
