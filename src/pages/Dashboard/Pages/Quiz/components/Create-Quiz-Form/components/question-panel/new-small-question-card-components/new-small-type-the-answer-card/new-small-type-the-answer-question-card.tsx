import React from "react";
import { CardContent } from "@/components/ui";
import { Edit3 } from "lucide-react";
import { NewSmallQuestionCardProps } from "../../existing-small-question-card-components/shared/types";
import { NewTypeTheAnswerQuestion } from "../../../../types";
import { truncateText } from "../../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { SmallBaseQuestionCard } from "../../existing-small-question-card-components/shared/small-base-question-card";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { useQuiz } from "../../../../Quiz-questions-context";
import { NewSmallQuestionHeader } from "../shared/new-small-question-header";
import { NewSmallTypeAnswerDisplay } from "./new-small-type-the-asnwer-display";

export const NewSmallTypeTheAnswerCard: React.FC<NewSmallQuestionCardProps> = ({
  question,
}) => {
  const { displayQuestion } = useQuiz();
  const newTtaQuestion = question as NewTypeTheAnswerQuestion;
  const truncatedText = truncateText(newTtaQuestion.text, 50);
  const isSelected = displayQuestion?.id === newTtaQuestion.id;

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-orange-500"
      gradientColor="bg-gradient-to-r from-background to-orange-500/30"
    >
      <NewSmallQuestionHeader
        icon={<Edit3 size={12} />}
        questionType="Type Answer"
        badgeColor="bg-orange-100 text-orange-600"
        questionId={newTtaQuestion.id}
        className={
          isSelected
            ? "bg-gradient-to-r from-background to-orange-500/30"
            : undefined
        }
      />

      <CardContent className="p-3">
        <QuestionBubble text={truncatedText} />
        <NewSmallTypeAnswerDisplay
          question={newTtaQuestion}
          truncateText={truncateText}
        />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
