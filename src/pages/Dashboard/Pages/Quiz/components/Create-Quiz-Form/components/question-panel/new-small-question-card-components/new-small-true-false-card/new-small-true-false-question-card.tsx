import React from "react";
import { CardContent } from "@/components/ui";
import { CheckCircle } from "lucide-react";
import { NewSmallQuestionCardProps } from "../../existing-small-question-card-components/shared/types";
import { NewTrueFalseQuestion } from "../../../../types";
import { truncateText } from "../../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { useQuiz } from "../../../../Quiz-questions-context";
import { SmallBaseQuestionCard } from "../../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionHeader } from "../shared/new-small-question-header";
import { NewTrueFalseOptions } from "./new-small-true-false-question-options";
import { QuestionBubble } from "../../shared/question-text-bubble";

export const NewSmallTrueFalseCard: React.FC<NewSmallQuestionCardProps> = ({
  question,
}) => {
  const { displayQuestion } = useQuiz();
  const newTfQuestion = question as NewTrueFalseQuestion;
  const truncatedText = truncateText(newTfQuestion.text, 50);
  const isSelected = displayQuestion?.id === newTfQuestion.id;

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-purple-500"
      gradientColor="bg-gradient-to-r from-background to-purple-500/30"
    >
      <NewSmallQuestionHeader
        icon={<CheckCircle size={12} />}
        questionType="True/False"
        badgeColor="bg-purple-100 text-purple-600"
        questionId={newTfQuestion.id}
        className={
          isSelected
            ? "bg-gradient-to-r from-background to-purple-500/30"
            : undefined
        }
      />
      
      <CardContent className="p-3">
        <QuestionBubble text={truncatedText} />
        <NewTrueFalseOptions question={newTfQuestion} />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};