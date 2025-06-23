import { CardContent } from "@/components/ui";
import { NewMultipleChoiceQuestion } from "../../../types";
import { SmallBaseQuestionCard } from "../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionCardProps } from "../existing-small-question-card-components/shared/types";
import { truncateText } from "../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { QuestionBubble } from "../shared/question-text-bubble";
import { NewSmallQuestionHeader } from "./shared/small-question-header";
import { List } from "lucide-react";

export const NewSmallMultipleChoiceCard: React.FC<
  NewSmallQuestionCardProps
> = ({ question, onRemove }) => {
  const newMcQuestion = question as NewMultipleChoiceQuestion;
  const truncatedText = truncateText(newMcQuestion.text, 50);

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-primary/80"
      gradientColor="bg-gradient-to-r from-background to-primary/20"
      onRemove={onRemove}
    >
       <NewSmallQuestionHeader
        icon={<List size={12} />}
        questionType="Multiple Choice"
        badgeColor="bg-blue-100 text-blue-600"
        questionId={newMcQuestion.id} // Assuming your NewMultipleChoiceQuestion has an id property of type number
      />
      <CardContent>
        <QuestionBubble text={truncatedText} />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
